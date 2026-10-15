import { useQuery } from "@tanstack/react-query";
import { asset } from "./asset";
import { Icon } from "./social";

export type CommunityEvent = { id: number; title: string; startsOn: string; endsOn: string | null; kind: string; place: string; cover: string; url: string };

/** What the home page shows before the API answers (and in the prerendered HTML). Mirrors the API's seed. */
export const defaultEvents: CommunityEvent[] = [
  { id: 1, title: "Kulüp Tanıtım Günleri", startsOn: "2026-10-06", endsOn: "2026-10-08", kind: "Topluluk buluşması", place: "OSTİM Teknik Üniversitesi", cover: "/assets/event-intro.webp", url: "" },
  { id: 2, title: "GDG On Campus Hackathon", startsOn: "2026-04-04", endsOn: "2026-04-05", kind: "48 saatlik hackathon", place: "OSTİM Teknik Üniversitesi", cover: "/assets/event-hackathon.webp", url: "" },
  { id: 3, title: "Engineerium '26", startsOn: "2026-02-24", endsOn: null, kind: "Mühendislik zirvesi", place: "Konferans Salonu", cover: "/assets/event-summit.webp", url: "" },
];

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await fetch("/api/events", { cache: "no-store" });
      if (!response.ok) throw new Error(`events ${response.status}`);
      return ((await response.json()) as { events: CommunityEvent[] }).events;
    },
    initialData: defaultEvents,
    retry: 1,
  }).data;
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "24 Şubat 2026", "06-08 Ekim 2026", "30 Ekim - 02 Kasım 2026", "30 Aralık 2026 - 02 Ocak 2027". */
export function formatEventDate(startsOn: string, endsOn: string | null) {
  const [y1, m1, d1] = startsOn.split("-");
  const month = (m: string) => MONTHS[Number(m) - 1] ?? "";
  if (!endsOn || endsOn === startsOn) return `${d1} ${month(m1)} ${y1}`;
  const [y2, m2, d2] = endsOn.split("-");
  if (y1 !== y2) return `${d1} ${month(m1)} ${y1} - ${d2} ${month(m2)} ${y2}`;
  if (m1 !== m2) return `${d1} ${month(m1)} - ${d2} ${month(m2)} ${y1}`;
  return `${d1}-${d2} ${month(m1)} ${y1}`;
}

// Built-in covers ship with the site (and its CDN); uploads come from the API.
export const coverSrc = (cover: string) => cover.startsWith("/assets/") ? asset(cover) : cover;
const tones = ["blue", "red", "yellow", "green"];
export const eventTone = (index: number) => tones[index % tones.length];

/** One event card in the home page design. `preview` renders a non-interactive copy for the admin. */
export function EventCard({ event, index, preview = false }: { event: Omit<CommunityEvent, "id">; index: number; preview?: boolean }) {
  const photo = !event.cover.startsWith("/assets/");
  const body = <>
    <div className={`event-cover${photo ? " is-photo" : ""}`}>
      {event.cover ? <img src={coverSrc(event.cover)} alt="" width="640" height="440" loading="lazy" draggable={false} /> : <span className="event-cover-empty">Kapak görseli</span>}
    </div>
    <div className="event-body">
      <time dateTime={event.startsOn}>{formatEventDate(event.startsOn, event.endsOn)}</time>
      <h3>{event.title}</h3>
      <p>{event.kind} · {event.place}</p>
      {event.url && <span className="event-more">Detaylar <Icon name="arrow" /></span>}
    </div>
  </>;
  const className = `event ${eventTone(index)}`;
  if (preview || !event.url) return <article className={className} aria-hidden={preview || undefined}>{body}</article>;
  return <a className={className} href={event.url} target="_blank" rel="noreferrer">{body}</a>;
}
