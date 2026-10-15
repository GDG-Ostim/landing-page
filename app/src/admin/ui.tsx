import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "../lib/asset";

/** Same-origin JSON call to the API. A 401 from /api/admin means the session ended. */
export async function api<T = Record<string, unknown>>(path: string, options: { method?: string; body?: object } = {}) {
  const method = options.method ?? (options.body ? "POST" : "GET");
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    ...(options.body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) } : {}),
  });
  const data = (response.status === 204 ? {} : await response.json().catch(() => ({}))) as T & { error?: string };
  return { response, data };
}

/** Mascot loop; a still image for reduced motion. */
export function Mascot({ name, className = "" }: { name: string; className?: string }) {
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

export function Confetti() {
  const colors = ["var(--blue)", "var(--red)", "var(--yellow)", "var(--green)"];
  return <div className="admin-confetti" aria-hidden="true">
    {Array.from({ length: 18 }, (_, index) => <i key={index} style={{
      "--x": `${(index * 37) % 100}%`, "--d": `${(index % 6) * 0.07}s`, "--r": `${(index * 47) % 360}deg`, background: colors[index % 4],
    } as CSSProperties} />)}
  </div>;
}

function Svg({ children, width = 2.4 }: { children: ReactNode; width?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
export const KeyIcon = () => <Svg><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8.7-8.7M16 7l3 3M14 9l2 2" /></Svg>;
export const LockIcon = () => <Svg width={2.6}><rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
export const CheckIcon = () => <Svg width={3.4}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const PlusIcon = () => <Svg width={3}><path d="M12 5v14M5 12h14" /></Svg>;
export const PencilIcon = () => <Svg><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></Svg>;
export const TrashIcon = () => <Svg><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Svg>;
export const UpIcon = () => <Svg width={3}><path d="m6 15 6-6 6 6" /></Svg>;
export const DownIcon = () => <Svg width={3}><path d="m6 9 6 6 6-6" /></Svg>;
export const BackIcon = () => <Svg width={3}><path d="M15 6l-6 6 6 6" /></Svg>;
export function EyeIcon({ open }: { open: boolean }) {
  return <Svg><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!open && <path d="M4 4l16 16" />}</Svg>;
}

export function Brand() {
  return <a className="admin-brand" href="/" aria-label="GDG Ostim Tech ana sayfa">
    <img src={asset("/assets/gdg-mark-exact.png")} alt="" width="70" height="70" />
    <span>Ostim Tech<small>Yönetim paneli</small></span>
  </a>;
}

/** Short celebratory confirmation after a save. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const timer = setTimeout(onDone, 2600); return () => clearTimeout(timer); }, [message, onDone]);
  return <div className="admin-toast" role="status"><span aria-hidden="true"><CheckIcon /></span>{message}</div>;
}

/** Native modal dialog: focus trap, Escape and backdrop click close it. */
export function Modal({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`admin-modal ${className}`} aria-labelledby="admin-modal-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="admin-modal-body">
      <h2 id="admin-modal-title">{title}</h2>
      {children}
    </div>
  </dialog>;
}
