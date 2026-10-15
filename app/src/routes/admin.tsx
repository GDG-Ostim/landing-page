import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Icon, type IconName } from "../lib/social";
import { BackIcon, Brand, CheckIcon, Confetti, EyeIcon, KeyIcon, LockIcon, Mascot, api } from "../admin/ui";
import { LinksScreen } from "../admin/links-screen";
import { SocialScreen } from "../admin/social-screen";
import { EventsScreen } from "../admin/events-screen";
import "../admin.css";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Yönetim · GDG Ostim Tech" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  // ?view=links keeps the open screen across reloads and makes Back work.
  validateSearch: (search: Record<string, unknown>): { view?: Exclude<View, "home"> } =>
    views.includes(search.view as View) && search.view !== "home" ? { view: search.view as Exclude<View, "home"> } : {},
  component: AdminPage,
});

type Admin = { username: string };
type Screen = "loading" | "login" | "authenticated" | "unavailable";
type Mood = "idle" | "shy" | "thinking" | "oops" | "tired";
type View = "home" | "links" | "social" | "events";

// The admin's quest path. A quest with a `view` is a finished screen the node opens.
const quests: { id: string; title: string; note: string; icon: IconName | "key"; view?: View; done: boolean }[] = [
  { id: "login", title: "Yönetici girişi", note: "Güvenli oturum ve kalıcı veri altyapısı", icon: "key", done: true },
  { id: "links", title: "Linkler", note: "/links sayfasındaki kartları yönet", icon: "users", view: "links", done: true },
  { id: "social", title: "Sosyal adresler", note: "Instagram, LinkedIn ve e-posta", icon: "instagram", view: "social", done: true },
  { id: "events", title: "Etkinlikler", note: "Ana sayfadaki etkinlik slider'ı", icon: "calendar", view: "events", done: true },
];
const views: View[] = ["home", "links", "social", "events"];

const bubbles: Record<Mood, string> = {
  idle: "Selam! Paneli açmak için giriş yap.",
  shy: "Söz, şifrene bakmıyorum!",
  thinking: "Bir saniye, kontrol ediyorum…",
  oops: "Hmm, bu bilgiler tutmadı. Bir daha dene!",
  tired: "Çok deneme oldu, biraz mola verelim.",
};

function AdminPage() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const view: View = Route.useSearch().view ?? "home";
  const navigate = useNavigate({ from: "/admin" });
  const go = (next: View) => { void navigate({ search: next === "home" ? {} : { view: next } }); window.scrollTo(0, 0); };

  async function checkSession() {
    setScreen("loading");
    setError("");
    try {
      const { response, data } = await api<{ admin: Admin }>("admin/session");
      if (response.ok) { setAdmin(data.admin); setScreen("authenticated"); }
      else if (response.status === 401) { setAdmin(null); setScreen("login"); }
      else setScreen("unavailable");
    } catch { setScreen("unavailable"); }
  }
  useEffect(() => { void checkSession(); }, []);

  const expired = useCallback(() => {
    setAdmin(null);
    setCelebrate(false);
    setMood("idle");
    setError("Oturumun sona erdi. Lütfen tekrar giriş yap.");
    setScreen("login");
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMood("thinking");
    try {
      const { response, data } = await api<{ admin: Admin }>("auth/login", { body: { username: username.trim(), password } });
      if (!response.ok) {
        const retry = Number(response.headers.get("Retry-After"));
        setError(response.status === 429 && retry > 0
          ? `Çok fazla deneme yapıldı. ${Math.ceil(retry / 60)} dakika sonra tekrar dene.`
          : data.error ?? "Giriş yapılamadı.");
        setMood(response.status === 429 ? "tired" : "oops");
        setShake(true);
        if (response.status === 401) { setPassword(""); setTimeout(() => passwordRef.current?.focus()); }
        return;
      }
      setAdmin(data.admin);
      setPassword("");
      setShowPassword(false);
      setMood("idle");
      setCelebrate(true);
      setScreen("authenticated");
    } catch {
      setError("Sunucuya ulaşılamıyor. Lütfen tekrar dene.");
      setMood("oops");
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { response } = await api("auth/logout", { body: {} });
      if (!response.ok) throw new Error("Logout failed");
      setAdmin(null);
      setCelebrate(false);
      setMood("idle");
      setScreen("login");
    } catch { setError("Çıkış yapılamadı. Lütfen tekrar dene."); }
    finally { setBusy(false); }
  }

  if (screen === "authenticated") {
    const done = quests.filter(quest => quest.done).length;
    return <main className="admin-page admin-dash">
      <header className="admin-top">
        {view === "home" ? <Brand /> : <button className="admin-back-btn" onClick={() => go("home")}><BackIcon />Panel</button>}
        <span className="admin-user" title="Oturum açık"><i aria-hidden="true" />{admin?.username}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => void logout()} disabled={busy}>{busy ? "Çıkılıyor…" : "Çıkış yap"}</button>
      </header>

      {view === "links" && <LinksScreen onExpired={expired} />}
      {view === "social" && <SocialScreen onExpired={expired} />}
      {view === "events" && <EventsScreen onExpired={expired} />}

      {view === "home" && <>
        <section className="admin-hello" aria-labelledby="admin-title">
          {celebrate && <Confetti />}
          <Mascot name={celebrate ? "join-cheer" : "hero-dragon"} />
          <div className="admin-hello-copy">
            <h1 id="admin-title">Hoş geldin, <em>{admin?.username}</em>!</h1>
            <p>Düzenlemek istediğin bölümü seç. Kaydettiğin değişiklikler sitede hemen görünür.</p>
            <div className="admin-progress" role="progressbar" aria-label="Kurulum ilerlemesi" aria-valuemin={0} aria-valuemax={quests.length} aria-valuenow={done}>
              <span style={{ width: `${(done / quests.length) * 100}%` }} />
            </div>
            <small className="admin-progress-label">{done === quests.length ? "Bütün bölümler hazır, iyi yönetimler!" : `${done} / ${quests.length} görev tamamlandı`}</small>
          </div>
        </section>

        <ol className="admin-path" aria-label="Yönetim bölümleri">
          {quests.map((quest, index) => {
            const content = <>
              <span className="admin-node" aria-hidden="true">{quest.done ? quest.view ? <Icon name="arrow" /> : <CheckIcon /> : <LockIcon />}</span>
              <span className="admin-quest-card">
                <span className="admin-quest-icon" aria-hidden="true">{quest.icon === "key" ? <KeyIcon /> : <Icon name={quest.icon} />}</span>
                <span className="admin-quest-text"><b>{quest.title}</b><small>{quest.note}</small></span>
                <span className="admin-quest-state">{quest.view ? "Aç" : quest.done ? "Tamam" : "Yakında"}</span>
              </span>
            </>;
            const state = quest.view ? "is-open" : quest.done ? "is-done" : "is-locked";
            return <li key={quest.id} className={`admin-quest ${state}`} style={{ "--i": index } as CSSProperties}>
              {quest.view ? <button className="admin-quest-link" onClick={() => go(quest.view!)}>{content}</button> : <div className="admin-quest-link">{content}</div>}
            </li>;
          })}
        </ol>
      </>}

      {error && <p className="admin-error" role="alert">{error}</p>}
      <p className="admin-foot">Oturumun güvenliğin için 8 saat sonra kendiliğinden kapanır.</p>
    </main>;
  }

  return <main className="admin-page admin-gate">
    <Brand />
    <div className={`admin-stage mood-${mood}`}>
      <p className="admin-bubble" aria-live="polite">{screen === "login" ? bubbles[mood] : screen === "loading" ? "Oturumuna bakıyorum…" : "Sunucuya ulaşamadım."}</p>
      <Mascot name="hero-dragon" />
    </div>

    <section className={`admin-card${shake ? " is-shaking" : ""}`} onAnimationEnd={event => { if (event.target === event.currentTarget) setShake(false); }} aria-labelledby="admin-title">
      <h1 id="admin-title">Yönetici girişi</h1>
      {screen === "loading" && <div className="admin-loading" role="status"><i /><i /><i /><span className="sr-only">Oturum kontrol ediliyor</span></div>}
      {screen === "unavailable" && <>
        <p role="alert">Yönetim servisine ulaşılamıyor. Biraz sonra tekrar dene.</p>
        <button className="btn btn-block" onClick={() => void checkSession()}>Tekrar dene</button>
      </>}
      {screen === "login" && <form onSubmit={login}>
        <label htmlFor="admin-username">Kullanıcı adı</label>
        <input id="admin-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={64} required
          value={username} onChange={event => setUsername(event.target.value)} onFocus={() => setMood("idle")} disabled={busy} />
        <label htmlFor="admin-password">Şifre</label>
        <div className="admin-password">
          <input ref={passwordRef} id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={128} required
            value={password} onChange={event => { setPassword(event.target.value); setMood("shy"); }} onFocus={() => setMood(current => current === "idle" ? "shy" : current)} onBlur={() => setMood(current => current === "shy" ? "idle" : current)} disabled={busy} />
          <button type="button" className="admin-eye" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword} disabled={busy}>
            <EyeIcon open={!showPassword} />
          </button>
        </div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={busy}>{busy ? "Kontrol ediliyor…" : "Giriş yap"}</button>
      </form>}
    </section>
    <a className="admin-back" href="/">← Siteye dön</a>
  </main>;
}
