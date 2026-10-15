import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon, LinkCard, linkIcons, type CommunityLink, type LinkIcon } from "../lib/social";
import { DownIcon, Mascot, Modal, PencilIcon, PlusIcon, Toast, TrashIcon, UpIcon, api } from "./ui";

type Link = CommunityLink & { position: number };
type Draft = { id?: number; title: string; url: string; icon: LinkIcon; note: string };
const emptyDraft: Draft = { title: "", url: "", icon: "users", note: "" };

export function LinksScreen({ onExpired }: { onExpired: () => void }) {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Link | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const [moved, setMoved] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const clearToast = useCallback(() => setToast(""), []);

  /** Runs an admin call; the response carries the full, ordered list. */
  async function run(path: string, options: { method?: string; body?: object }, done?: string) {
    setBusy(true);
    try {
      const { response, data } = await api<{ links: Link[] }>(path, options);
      if (response.status === 401) { onExpired(); return false; }
      if (!response.ok) { setFormError(data.error ?? "İşlem tamamlanamadı."); return false; }
      setLinks(data.links);
      void queryClient.invalidateQueries({ queryKey: ["links"] });
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
        const { response, data } = await api<{ links: Link[] }>("admin/links");
        if (response.status === 401) onExpired();
        else if (response.ok) setLinks(data.links);
        else setLoadError(data.error ?? "Linkler yüklenemedi.");
      } catch { setLoadError("Sunucuya ulaşılamıyor."); }
    })();
  }, [onExpired]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setFormError("");
    const { id, ...body } = draft;
    const ok = await run(id ? `admin/links/${id}` : "admin/links", { method: id ? "PUT" : "POST", body }, id ? "Link güncellendi!" : "Yeni link eklendi!");
    if (ok) setDraft(null);
  }

  async function move(link: Link, direction: "up" | "down") {
    setFormError("");
    if (await run(`admin/links/${link.id}/move`, { method: "POST", body: { direction } })) {
      setMoved(link.id);
      setTimeout(() => setMoved(current => current === link.id ? null : current), 500);
    }
  }

  async function remove() {
    if (!deleting) return;
    setFormError("");
    if (await run(`admin/links/${deleting.id}`, { method: "DELETE" }, "Link silindi.")) setDeleting(null);
  }

  const open = (value: Draft) => { setFormError(""); setDraft(value); };

  return <section className="admin-screen" aria-labelledby="links-title">
    <div className="admin-screen-head">
      <div>
        <h1 id="links-title">Linkler</h1>
        <p>/links sayfasındaki kartlar. Sırayı oklarla değiştir.</p>
      </div>
      <div className="admin-screen-actions">
        <a className="btn btn-secondary btn-sm" href="/links" target="_blank" rel="noreferrer">Sayfayı gör</a>
        <button className="btn btn-green" onClick={() => open(emptyDraft)}><PlusIcon />Link ekle</button>
      </div>
    </div>

    {formError && !draft && !deleting && <p className="admin-error" role="alert">{formError}</p>}
    {!links && !loadError && <div className="admin-loading" role="status"><i /><i /><i /><span className="sr-only">Linkler yükleniyor</span></div>}
    {loadError && <p className="admin-error" role="alert">{loadError}</p>}

    {links?.length === 0 && <div className="admin-empty">
      <Mascot name="hero-dragon" />
      <h2>Henüz link yok</h2>
      <p>İlk kartı ekle; /links sayfasında hemen görünsün.</p>
      <button className="btn" onClick={() => open(emptyDraft)}><PlusIcon />İlk linki ekle</button>
    </div>}

    {links && links.length > 0 && <ol className="admin-list">
      {links.map((link, index) => <li key={link.id} className={`admin-row${moved === link.id ? " is-moved" : ""}`}>
        <span className="admin-row-rank" aria-label={`${index + 1}. sıra`}>{index + 1}</span>
        <div className="admin-row-card"><LinkCard link={link} preview /><small className="admin-row-url">{link.url}</small></div>
        <div className="admin-row-tools">
          <button className="admin-tool" onClick={() => void move(link, "up")} disabled={busy || index === 0} aria-label={`${link.title}: yukarı taşı`}><UpIcon /></button>
          <button className="admin-tool" onClick={() => void move(link, "down")} disabled={busy || index === links.length - 1} aria-label={`${link.title}: aşağı taşı`}><DownIcon /></button>
          <button className="admin-tool is-blue" onClick={() => open({ id: link.id, title: link.title, url: link.url, icon: link.icon, note: link.note })} disabled={busy} aria-label={`${link.title}: düzenle`}><PencilIcon /></button>
          <button className="admin-tool is-red" onClick={() => { setFormError(""); setDeleting(link); }} disabled={busy} aria-label={`${link.title}: sil`}><TrashIcon /></button>
        </div>
      </li>)}
    </ol>}

    {draft && <Modal title={draft.id ? "Linki düzenle" : "Yeni link"} onClose={() => setDraft(null)}>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-preview" aria-label="Önizleme">
          <span className="admin-preview-label">Önizleme</span>
          <LinkCard link={{ ...draft, title: draft.title || "Kart başlığı", url: draft.url || "/" }} preview />
        </div>
        <label htmlFor="link-title">Başlık</label>
        <input id="link-title" required maxLength={80} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="Örn. Discord sunucumuz" autoFocus />
        <label htmlFor="link-url">Adres</label>
        <input id="link-url" required maxLength={500} inputMode="url" autoCapitalize="none" spellCheck={false} value={draft.url} onChange={event => setDraft({ ...draft, url: event.target.value })} placeholder="https://… ya da e-posta adresi" />
        <fieldset className="admin-icons">
          <legend>İkon</legend>
          {linkIcons.map(option => <label key={option.id} className={`admin-icon-option tone-${option.tone}`}>
            <input type="radio" name="link-icon" value={option.id} checked={draft.icon === option.id} onChange={() => setDraft({ ...draft, icon: option.id })} />
            <span className="admin-icon-tile" aria-hidden="true"><Icon name={option.id} /></span>
            <small>{option.label}</small>
          </label>)}
        </fieldset>
        <label htmlFor="link-note">Kısa açıklama <em>(isteğe bağlı)</em></label>
        <input id="link-note" maxLength={120} value={draft.note} onChange={event => setDraft({ ...draft, note: event.target.value })} placeholder="Örn. Haftalık duyurular burada" />
        {formError && <p className="admin-error" role="alert">{formError}</p>}
        <div className="admin-form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setDraft(null)} disabled={busy}>Vazgeç</button>
          <button type="submit" className="btn btn-green" disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </form>
    </Modal>}

    {deleting && <Modal title="Bu link silinsin mi?" onClose={() => setDeleting(null)} className="is-small">
      <p className="admin-modal-text"><b>{deleting.title}</b> /links sayfasından kaldırılacak. Bu işlem geri alınamaz.</p>
      {formError && <p className="admin-error" role="alert">{formError}</p>}
      <div className="admin-form-actions">
        <button className="btn btn-secondary" onClick={() => setDeleting(null)} disabled={busy} autoFocus>Vazgeç</button>
        <button className="btn" onClick={() => void remove()} disabled={busy}>{busy ? "Siliniyor…" : "Sil"}</button>
      </div>
    </Modal>}

    {toast && <Toast message={toast} onDone={clearToast} />}
  </section>;
}
