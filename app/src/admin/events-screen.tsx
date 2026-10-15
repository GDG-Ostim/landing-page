import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EventCard, coverSrc, formatEventDate, type CommunityEvent } from "../lib/events";
import { DownIcon, Mascot, Modal, PencilIcon, PlusIcon, Toast, TrashIcon, UpIcon, api } from "./ui";

type Event = CommunityEvent & { position: number };
type Draft = { id?: number; title: string; startsOn: string; endsOn: string; kind: string; place: string; cover: string; url: string };
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const emptyDraft = (): Draft => ({ title: "", startsOn: today(), endsOn: "", kind: "", place: "", cover: "", url: "" });
const kinds = ["Workshop", "Hackathon", "Buluşma", "Konferans", "Eğitim serisi"];
const placesHint = ["OSTİM Teknik Üniversitesi", "Çevrim içi"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Large photos are scaled to 1600px and re-encoded before upload; small ones go as they are. */
async function prepareImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Yalnızca JPG, PNG veya WebP seçebilirsin.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Bu görsel açılamadı."); });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1.5 * 1024 * 1024) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>(done => canvas.toBlob(done, type, 0.86));
  // Browsers without WebP encoding hand back PNG; JPEG is then the smaller choice.
  const webp = await encode("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
  if (!blob) throw new Error("Görsel hazırlanamadı.");
  return blob;
}

export function EventsScreen({ onExpired }: { onExpired: () => void }) {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [multiDay, setMultiDay] = useState(false);
  const [deleting, setDeleting] = useState<Event | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const [moved, setMoved] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const clearToast = useCallback(() => setToast(""), []);

  async function run(path: string, options: { method?: string; body?: object }, done?: string) {
    setBusy(true);
    try {
      const { response, data } = await api<{ events: Event[] }>(path, options);
      if (response.status === 401) { onExpired(); return false; }
      if (!response.ok) { setFormError(data.error ?? "İşlem tamamlanamadı."); return false; }
      setEvents(data.events);
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      if (done) setToast(done);
      return true;
    } catch {
      setFormError("Sunucuya ulaşılamıyor. Lütfen tekrar dene.");
      return false;
    } finally { setBusy(false); }
  }

  useEffect(() => {
    void (async () => {
      try {
        const { response, data } = await api<{ events: Event[] }>("admin/events");
        if (response.status === 401) onExpired();
        else if (response.ok) setEvents(data.events);
        else setLoadError(data.error ?? "Etkinlikler yüklenemedi.");
      } catch { setLoadError("Sunucuya ulaşılamıyor."); }
    })();
  }, [onExpired]);

  const open = (value: Draft) => { setFormError(""); setMultiDay(!!value.endsOn); setDraft(value); };

  async function upload(file: File | undefined) {
    if (!file || !draft) return;
    setFormError("");
    setUploading(true);
    try {
      const blob = await prepareImage(file);
      if (blob.size > MAX_BYTES) throw new Error("Görsel 5 MB'tan küçük olmalı.");
      const response = await fetch("/api/admin/uploads", { method: "POST", credentials: "same-origin", headers: { "Content-Type": blob.type }, body: blob });
      if (response.status === 401) { onExpired(); return; }
      const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(response.status === 413 ? "Görsel 5 MB'tan küçük olmalı." : data.error ?? "Görsel yüklenemedi.");
      setDraft(current => current && { ...current, cover: data.url! });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Görsel yüklenemedi.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  const onPick = (event: ChangeEvent<HTMLInputElement>) => void upload(event.target.files?.[0]);
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setFormError("");
    if (!draft.cover) { setFormError("Bir kapak görseli yükle."); return; }
    const { id, ...body } = draft;
    const payload = { ...body, endsOn: multiDay && body.endsOn ? body.endsOn : null };
    const ok = await run(id ? `admin/events/${id}` : "admin/events", { method: id ? "PUT" : "POST", body: payload }, id ? "Etkinlik güncellendi!" : "Etkinlik takvime eklendi!");
    if (ok) setDraft(null);
  }

  async function move(item: Event, direction: "up" | "down") {
    setFormError("");
    if (await run(`admin/events/${item.id}/move`, { method: "POST", body: { direction } })) {
      setMoved(item.id);
      setTimeout(() => setMoved(current => current === item.id ? null : current), 500);
    }
  }

  async function remove() {
    if (!deleting) return;
    setFormError("");
    if (await run(`admin/events/${deleting.id}`, { method: "DELETE" }, "Etkinlik silindi.")) setDeleting(null);
  }

  const previewIndex = draft?.id ? Math.max(0, events?.findIndex(item => item.id === draft.id) ?? 0) : events?.length ?? 0;

  return <section className="admin-screen" aria-labelledby="events-title">
    <div className="admin-screen-head">
      <div>
        <h1 id="events-title">Etkinlikler</h1>
        <p>Ana sayfadaki slider. Sırayı oklarla değiştir.</p>
      </div>
      <div className="admin-screen-actions">
        <a className="btn btn-secondary btn-sm" href="/#events" target="_blank" rel="noreferrer">Sayfayı gör</a>
        <button className="btn btn-green" onClick={() => open(emptyDraft())}><PlusIcon />Etkinlik ekle</button>
      </div>
    </div>

    {formError && !draft && !deleting && <p className="admin-error" role="alert">{formError}</p>}
    {!events && !loadError && <div className="admin-loading" role="status"><i /><i /><i /><span className="sr-only">Etkinlikler yükleniyor</span></div>}
    {loadError && <p className="admin-error" role="alert">{loadError}</p>}

    {events?.length === 0 && <div className="admin-empty">
      <Mascot name="tracks-fly" />
      <h2>Takvim boş</h2>
      <p>Etkinlik eklenene kadar ana sayfada “yakında” mesajı görünür.</p>
      <button className="btn" onClick={() => open(emptyDraft())}><PlusIcon />İlk etkinliği ekle</button>
    </div>}

    {events && events.length > 0 && <ol className="admin-list">
      {events.map((item, index) => <li key={item.id} className={`admin-row admin-event-row${moved === item.id ? " is-moved" : ""}`}>
        <span className="admin-row-rank" aria-label={`${index + 1}. sıra`}>{index + 1}</span>
        <span className={`admin-event-thumb${item.cover.startsWith("/assets/") ? "" : " is-photo"}`} aria-hidden="true"><img src={coverSrc(item.cover)} alt="" loading="lazy" /></span>
        <span className="admin-event-text">
          <b>{item.title}</b>
          <small>{formatEventDate(item.startsOn, item.endsOn)} · {item.kind}</small>
          <small>{item.place}{item.url ? " · bağlantılı" : ""}</small>
        </span>
        <div className="admin-row-tools">
          <button className="admin-tool" onClick={() => void move(item, "up")} disabled={busy || index === 0} aria-label={`${item.title}: yukarı taşı`}><UpIcon /></button>
          <button className="admin-tool" onClick={() => void move(item, "down")} disabled={busy || index === events.length - 1} aria-label={`${item.title}: aşağı taşı`}><DownIcon /></button>
          <button className="admin-tool is-blue" onClick={() => open({ id: item.id, title: item.title, startsOn: item.startsOn, endsOn: item.endsOn ?? "", kind: item.kind, place: item.place, cover: item.cover, url: item.url })} disabled={busy} aria-label={`${item.title}: düzenle`}><PencilIcon /></button>
          <button className="admin-tool is-red" onClick={() => { setFormError(""); setDeleting(item); }} disabled={busy} aria-label={`${item.title}: sil`}><TrashIcon /></button>
        </div>
      </li>)}
    </ol>}

    {draft && <Modal title={draft.id ? "Etkinliği düzenle" : "Yeni etkinlik"} onClose={() => setDraft(null)} className="is-wide">
      <form className="admin-form admin-event-form" onSubmit={save}>
        <div className="admin-event-fields">
          <label htmlFor="event-title">Başlık</label>
          <input id="event-title" required maxLength={80} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Örn. Flutter Workshop" autoFocus />

          <div className="admin-dates">
            <div>
              <label htmlFor="event-start">{multiDay ? "Başlangıç" : "Tarih"}</label>
              <input id="event-start" type="date" required min="2000-01-01" max="2100-12-31" value={draft.startsOn} onChange={event => setDraft({ ...draft, startsOn: event.target.value })} />
            </div>
            {multiDay && <div>
              <label htmlFor="event-end">Bitiş</label>
              <input id="event-end" type="date" required min={draft.startsOn} max="2100-12-31" value={draft.endsOn} onChange={event => setDraft({ ...draft, endsOn: event.target.value })} />
            </div>}
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={multiDay} onChange={event => { setMultiDay(event.target.checked); if (event.target.checked && !draft.endsOn) setDraft({ ...draft, endsOn: draft.startsOn }); }} />
            <span aria-hidden="true" />Birden fazla gün sürüyor
          </label>

          <label htmlFor="event-kind">Tür</label>
          <input id="event-kind" required maxLength={40} value={draft.kind} onChange={event => setDraft({ ...draft, kind: event.target.value })} placeholder="Örn. Workshop" />
          <div className="admin-chips" aria-label="Hazır türler">
            {kinds.map(kind => <button type="button" key={kind} className={draft.kind === kind ? "is-on" : ""} onClick={() => setDraft({ ...draft, kind })}>{kind}</button>)}
          </div>

          <label htmlFor="event-place">Yer</label>
          <input id="event-place" required maxLength={80} value={draft.place} onChange={event => setDraft({ ...draft, place: event.target.value })} placeholder="Mekân ya da Çevrim içi" />
          <div className="admin-chips" aria-label="Hazır yerler">
            {placesHint.map(place => <button type="button" key={place} className={draft.place === place ? "is-on" : ""} onClick={() => setDraft({ ...draft, place })}>{place}</button>)}
          </div>

          <label htmlFor="event-url">Bağlantı <em>(isteğe bağlı)</em></label>
          <input id="event-url" maxLength={500} inputMode="url" autoCapitalize="none" spellCheck={false} value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} placeholder="Kayıt ya da duyuru adresi" />
        </div>

        <div className="admin-event-side">
          <span className="admin-preview-label">Kapak görseli</span>
          <div className={`admin-drop${dragging ? " is-dragging" : ""}${uploading ? " is-busy" : ""}`}
            onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
            <input ref={fileRef} id="event-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} disabled={uploading} />
            <label htmlFor="event-cover" className="btn btn-blue btn-sm">{uploading ? "Yükleniyor…" : draft.cover ? "Görseli değiştir" : "Görsel seç"}</label>
            <small>JPG, PNG veya WebP · en fazla 5 MB · sürükleyip bırakabilirsin</small>
          </div>
          <span className="admin-preview-label">Önizleme</span>
          <div className="admin-event-preview">
            <EventCard preview index={previewIndex} event={{ ...draft, title: draft.title || "Etkinlik adı", kind: draft.kind || "Tür", place: draft.place || "Yer", endsOn: multiDay ? draft.endsOn || null : null, startsOn: draft.startsOn || today() }} />
          </div>
        </div>

        {formError && <p className="admin-error admin-event-error" role="alert">{formError}</p>}
        <div className="admin-form-actions admin-event-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDraft(null)} disabled={busy}>Vazgeç</button>
          <button type="submit" className="btn btn-green" disabled={busy || uploading}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </form>
    </Modal>}

    {deleting && <Modal title="Bu etkinlik silinsin mi?" onClose={() => setDeleting(null)} className="is-small">
      <p className="admin-modal-text"><b>{deleting.title}</b> ana sayfadaki slider'dan ve kapak görseliyle birlikte kaldırılacak. Bu işlem geri alınamaz.</p>
      {formError && <p className="admin-error" role="alert">{formError}</p>}
      <div className="admin-form-actions">
        <button className="btn btn-secondary" onClick={() => setDeleting(null)} disabled={busy} autoFocus>Vazgeç</button>
        <button className="btn" onClick={() => void remove()} disabled={busy}>{busy ? "Siliniyor…" : "Sil"}</button>
      </div>
    </Modal>}

    {toast && <Toast message={toast} onDone={clearToast} />}
  </section>;
}
