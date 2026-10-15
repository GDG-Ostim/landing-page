import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { asset } from "../lib/asset";
import { Icon, type IconName } from "../lib/social";
import "../admin.css";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Yönetim · GDG Ostim Tech" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminPage,
});

type Admin = { username: string };
type Screen = "loading" | "login" | "authenticated" | "unavailable";
type Mood = "idle" | "shy" | "thinking" | "oops" | "tired";

// The admin's quest path. Later phases flip `ready` as their screens ship.
const quests: { id: string; title: string; note: string; icon: IconName | "key"; ready: boolean }[] = [
  { id: "login", title: "Yönetici girişi", note: "Güvenli oturum ve kalıcı veri altyapısı", icon: "key", ready: true },
  { id: "links", title: "Linkler", note: "/links sayfasındaki kartları yönet", icon: "users", ready: false },
  { id: "social", title: "Sosyal adresler", note: "Instagram, LinkedIn ve e-posta", icon: "instagram", ready: false },
  { id: "events", title: "Etkinlikler", note: "Ana sayfadaki etkinlik slider'ı", icon: "world", ready: false },
];

const bubbles: Record<Mood, string> = {
  idle: "Selam! Paneli açmak için giriş yap.",
  shy: "Söz, şifrene bakmıyorum!",
  thinking: "Bir saniye, kontrol ediyorum…",
  oops: "Hmm, bu bilgiler tutmadı. Bir daha dene!",
  tired: "Çok deneme oldu, biraz mola verelim.",
};

async function api(path: string, body?: object) {
  const response = await fetch(`/api/${path}`, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = response.status === 204 ? {} : await response.json();
  return { response, data };
}

/** Mascot loop; a still image for reduced motion. */
function Mascot({ name, className = "" }: { name: string; className?: string }) {
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  return <div className={`admin-mascot ${className}`} aria-hidden="true">
    {still
      ? <img src={asset(`/assets/${name}.webp`)} alt="" width="720" height="720" />
      : <video key={name} autoPlay muted loop playsInline preload="auto" poster={asset(`/assets/${name}.webp`)}>
          <source src={asset(`/assets/${name}.webm`)} type="video/webm" />
          <source src={asset(`/assets/${name}.mp4`)} type="video/mp4" />
        </video>}
  </div>;
}

function Confetti() {
  const colors = ["var(--blue)", "var(--red)", "var(--yellow)", "var(--green)"];
  return <div className="admin-confetti" aria-hidden="true">
    {Array.from({ length: 18 }, (_, index) => <i key={index} style={{
      "--x": `${(index * 37) % 100}%`, "--d": `${(index % 6) * 0.07}s`, "--r": `${(index * 47) % 360}deg`, background: colors[index % 4],
    } as CSSProperties} />)}
  </div>;
}

function KeyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.7-8.7M16 7l3 3M14 9l2 2" />
  </svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
}

function EyeIcon({ open }: { open: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
    {!open && <path d="M4 4l16 16" />}
  </svg>;
}

function Brand() {
  return <a className="admin-brand" href="/" aria-label="GDG Ostim Tech ana sayfa">
    <img src={asset("/assets/gdg-mark-exact.png")} alt="" width="70" height="70" />
    <span>Ostim Tech<small>Yönetim paneli</small></span>
  </a>;
}

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

  async function checkSession() {
    setScreen("loading");
    setError("");
    try {
      const { response, data } = await api("admin/session");
      if (response.ok) { setAdmin(data.admin); setScreen("authenticated"); }
      else if (response.status === 401) { setAdmin(null); setScreen("login"); }
      else setScreen("unavailable");
    } catch { setScreen("unavailable"); }
  }
  useEffect(() => { void checkSession(); }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMood("thinking");
    try {
      const { response, data } = await api("auth/login", { username: username.trim(), password });
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
      const { response } = await api("auth/logout", {});
      if (!response.ok) throw new Error("Logout failed");
      setAdmin(null);
      setCelebrate(false);
      setMood("idle");
      setScreen("login");
    } catch { setError("Çıkış yapılamadı. Lütfen tekrar dene."); }
    finally { setBusy(false); }
  }

  if (screen === "authenticated") {
    const done = quests.filter(quest => quest.ready).length;
    return <main className="admin-page admin-dash">
      <header className="admin-top">
        <Brand />
        <span className="admin-user" title="Oturum açık"><i aria-hidden="true" />{admin?.username}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => void logout()} disabled={busy}>{busy ? "Çıkılıyor…" : "Çıkış yap"}</button>
      </header>

      <section className="admin-hello" aria-labelledby="admin-title">
        {celebrate && <Confetti />}
        <Mascot name={celebrate ? "join-cheer" : "hero-dragon"} className={celebrate ? "is-cheering" : ""} />
        <div className="admin-hello-copy">
          <h1 id="admin-title">Hoş geldin, <em>{admin?.username}</em>!</h1>
          <p>Panelin hazır. Yeni ekranlar açıldıkça içerik yönetimi buradan yapılacak.</p>
          <div className="admin-progress" role="progressbar" aria-label="Kurulum ilerlemesi" aria-valuemin={0} aria-valuemax={quests.length} aria-valuenow={done}>
            <span style={{ width: `${(done / quests.length) * 100}%` }} />
          </div>
          <small className="admin-progress-label">{done} / {quests.length} görev tamamlandı</small>
        </div>
      </section>

      <ol className="admin-path" aria-label="Yönetim bölümleri">
        {quests.map((quest, index) => <li key={quest.id} className={`admin-quest ${quest.ready ? "is-done" : "is-locked"}`} style={{ "--i": index } as CSSProperties}>
          <span className="admin-node" aria-hidden="true">
            {quest.ready ? <CheckIcon /> : <LockIcon />}
          </span>
          <div className="admin-quest-card">
            <span className="admin-quest-icon" aria-hidden="true">{quest.icon === "key" ? <KeyIcon /> : <Icon name={quest.icon} />}</span>
            <span className="admin-quest-text"><b>{quest.title}</b><small>{quest.note}</small></span>
            <span className="admin-quest-state">{quest.ready ? "Tamam" : "Yakında"}</span>
          </div>
        </li>)}
      </ol>

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
