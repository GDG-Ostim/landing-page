import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon, SocialTiles, type IconName, type Social } from "../lib/social";
import { CheckIcon, Toast, api } from "./ui";

const fields: { id: keyof Social; icon: IconName; label: string; placeholder: string; hint: string }[] = [
  { id: "instagram", icon: "instagram", label: "Instagram adresi", placeholder: "https://instagram.com/kullaniciadi", hint: "@kullaniciadi da yazabilirsin." },
  { id: "linkedin", icon: "linkedin", label: "LinkedIn adresi", placeholder: "https://www.linkedin.com/company/…", hint: "“Duyuruları takip et” düğmesi de buraya gider." },
  { id: "email", icon: "mail", label: "E-posta adresi", placeholder: "ad@alanadi.com", hint: "Sadece adresi yaz; mailto: bağlantısını site oluşturur." },
];
// Every place on the site that reads these three values.
const places = ["Ana sayfa üst menüsü", "Ana sayfa alt bölümü", "/links sosyal ikonları", "“Duyuruları takip et” düğmesi"];

export function SocialScreen({ onExpired }: { onExpired: () => void }) {
  const [saved, setSaved] = useState<Social | null>(null);
  const [draft, setDraft] = useState<Social | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Social, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(0);
  const queryClient = useQueryClient();
  const clearToast = useCallback(() => setToast(""), []);

  useEffect(() => {
    void (async () => {
      try {
        const { response, data } = await api<{ social: Social }>("admin/social");
        if (response.status === 401) onExpired();
        else if (response.ok) { setSaved(data.social); setDraft(data.social); }
        else setError(data.error ?? "Adresler yüklenemedi.");
      } catch { setError("Sunucuya ulaşılamıyor."); }
    })();
  }, [onExpired]);

  const dirty = !!draft && !!saved && fields.some(field => draft[field.id] !== saved[field.id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const { response, data } = await api<{ social: Social; errors?: Partial<Record<keyof Social, string>> }>("admin/social", { method: "PUT", body: draft });
      if (response.status === 401) { onExpired(); return; }
      if (!response.ok) { setErrors(data.errors ?? {}); setError(data.error ?? "Kaydedilemedi."); return; }
      setSaved(data.social);
      setDraft(data.social);
      queryClient.setQueryData(["social"], data.social);
      setPulse(value => value + 1);
      setToast(`Kaydedildi! ${places.length} yer güncellendi.`);
    } catch { setError("Sunucuya ulaşılamıyor. Lütfen tekrar dene."); }
    finally { setBusy(false); }
  }

  return <section className="admin-screen" aria-labelledby="social-title">
    <div className="admin-screen-head">
      <div>
        <h1 id="social-title">Sosyal adresler</h1>
        <p>Bir kez değiştir, sitedeki bütün sosyal bağlantılar güncellensin.</p>
      </div>
    </div>

    {!draft && !error && <div className="admin-loading" role="status"><i /><i /><i /><span className="sr-only">Adresler yükleniyor</span></div>}
    {!draft && error && <p className="admin-error" role="alert">{error}</p>}

    {draft && <div className="admin-social">
      <form className="admin-panel admin-form" onSubmit={save} noValidate>
        {fields.map(field => <div className={`admin-field${errors[field.id] ? " has-error" : ""}`} key={field.id}>
          <label htmlFor={`social-${field.id}`}>{field.label}</label>
          <div className="admin-input-icon">
            <span className={`social-tile ${field.icon === "mail" ? "mail" : field.icon}`} aria-hidden="true"><Icon name={field.icon} /></span>
            <input id={`social-${field.id}`} type={field.id === "email" ? "email" : "url"} inputMode={field.id === "email" ? "email" : "url"} autoCapitalize="none" spellCheck={false}
              maxLength={300} required value={draft[field.id]} placeholder={field.placeholder}
              aria-invalid={!!errors[field.id]} aria-describedby={`social-${field.id}-hint`}
              onChange={event => setDraft({ ...draft, [field.id]: event.target.value })} />
          </div>
          <small id={`social-${field.id}-hint`} className={errors[field.id] ? "admin-field-error" : ""}>{errors[field.id] ?? field.hint}</small>
        </div>)}
        {error && !Object.keys(errors).length && <p className="admin-error" role="alert">{error}</p>}
        <div className="admin-form-actions">
          {dirty && <button type="button" className="btn btn-secondary" onClick={() => { setDraft(saved); setErrors({}); setError(""); }} disabled={busy}>Geri al</button>}
          <button type="submit" className="btn btn-green" disabled={busy || !dirty}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      </form>

      <aside className="admin-panel admin-places" aria-label="Nerelerde kullanılır">
        <h2>Önizleme</h2>
        <SocialTiles className="admin-social-preview" social={{ ...draft, email: draft.email.replace(/^mailto:/i, "") }} />
        <h3>Nerelerde güncellenir?</h3>
        <ul key={pulse} className={pulse ? "is-saved" : ""}>
          {places.map((place, index) => <li key={place} style={{ animationDelay: `${index * 0.12}s` }}>
            <span aria-hidden="true"><CheckIcon /></span>{place}
          </li>)}
        </ul>
      </aside>
    </div>}

    {toast && <Toast message={toast} onDone={clearToast} />}
  </section>;
}
