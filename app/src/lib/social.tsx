import { useQuery } from "@tanstack/react-query";

// Every outbound community link lives here (navbar, footer and /links all read it).
// Icons are Tabler outline glyphs (MIT), inlined so they need no extra request.

export type IconName = "instagram" | "linkedin" | "mail" | "whatsapp" | "world" | "users" | "github" | "youtube" | "calendar" | "arrow";

const paths: Record<IconName, string[]> = {
  instagram: ["M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z", "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M16.5 7.5v.01"],
  linkedin: ["M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z", "M8 11v5", "M8 8v.01", "M12 16v-5", "M16 16v-3a2 2 0 0 0 -4 0"],
  mail: ["M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z", "M3 7l9 6l9 -6"],
  whatsapp: ["M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9", "M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"],
  world: ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M3.6 9h16.8", "M3.6 15h16.8", "M11.5 3a17 17 0 0 0 0 18", "M12.5 3a17 17 0 0 1 0 18"],
  users: ["M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0", "M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1", "M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0", "M17 10h2a2 2 0 0 1 2 2v1", "M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0", "M3 13v-1a2 2 0 0 1 2 -2h2"],
  github: ["M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"],
  youtube: ["M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8z", "M10 9l5 3l-5 3z"],
  calendar: ["M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z", "M16 3v4", "M8 3v4", "M4 11h16"],
  arrow: ["M17 7l-10 10", "M8 7h9v9"],
};

export function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name].map(d => <path d={d} key={d} />)}
  </svg>;
}

export const links = {
  instagram: "https://instagram.com/gdgostimtech",
  linkedin: "https://www.linkedin.com/company/ostimtech-gdsc/",
  mail: "mailto:gdgostimtech@outlook.com",
  join: "https://gdg.community.dev/gdg-on-campus-ostim-teknik-university-ankara-turkiye",
  whatsapp: [
    { label: "GDG on Campus Topluluğu I", href: "https://chat.whatsapp.com/H9macgZPZxFJUVZH4Sia1V" },
    { label: "GDG on Campus Topluluğu II", href: "https://chat.whatsapp.com/DyEscGIRnLaGnVNP2UgeiA" },
  ],
};

export const socials: { id: IconName; label: string; href: string }[] = [
  { id: "instagram", label: "Instagram", href: links.instagram },
  { id: "linkedin", label: "LinkedIn", href: links.linkedin },
  { id: "mail", label: "E-posta", href: links.mail },
];

/** Row of small 3D icon tiles. */
export function SocialTiles({ className = "" }: { className?: string }) {
  return <div className={`social-tiles ${className}`}>
    {socials.map(s => <a className={`social-tile ${s.id}`} href={s.href} key={s.id} aria-label={s.label}
      {...(s.id === "mail" ? {} : { target: "_blank", rel: "noreferrer" })}><Icon name={s.id} /></a>)}
  </div>;
}

// ---------- /links cards (managed in the admin panel) ----------

/** Icons an admin can pick for a link card, with the card colour each one uses. Matches LINK_ICONS in the API. */
export const linkIcons = [
  { id: "users", label: "Topluluk", tone: "red" },
  { id: "whatsapp", label: "WhatsApp", tone: "green" },
  { id: "instagram", label: "Instagram", tone: "instagram" },
  { id: "linkedin", label: "LinkedIn", tone: "linkedin" },
  { id: "mail", label: "E-posta", tone: "mail" },
  { id: "world", label: "Web", tone: "blue" },
  { id: "github", label: "GitHub", tone: "github" },
  { id: "youtube", label: "YouTube", tone: "youtube" },
  { id: "calendar", label: "Etkinlik", tone: "yellow" },
] as const satisfies readonly { id: IconName; label: string; tone: string }[];
export type LinkIcon = (typeof linkIcons)[number]["id"];
export type CommunityLink = { id: number; title: string; url: string; icon: LinkIcon; note: string };

/** What /links shows before the API answers (and in the prerendered HTML). Mirrors the API's seed. */
export const defaultLinks: CommunityLink[] = [
  { id: 1, title: "Bize katılmayı unutmayın!", url: links.join, icon: "users", note: "GDG Community'de üye ol, etkinlik duyurularını al" },
  ...links.whatsapp.map((group, index) => ({ id: index + 2, title: group.label, url: group.href, icon: "whatsapp" as const, note: "WhatsApp topluluğu · ücretsiz" })),
  { id: 4, title: "Web sitemiz", url: "/", icon: "world", note: "gdgostimtech.com" },
];

export function useCommunityLinks() {
  return useQuery({
    queryKey: ["links"],
    queryFn: async () => {
      const response = await fetch("/api/links", { cache: "no-store" });
      if (!response.ok) throw new Error(`links ${response.status}`);
      return ((await response.json()) as { links: CommunityLink[] }).links;
    },
    initialData: defaultLinks,
    retry: 1,
  }).data;
}

const toneOf = (icon: LinkIcon) => linkIcons.find(item => item.id === icon)?.tone ?? "blue";

/** One /links card. `preview` renders a non-interactive copy for the admin form. */
export function LinkCard({ link, preview = false }: { link: Pick<CommunityLink, "title" | "url" | "icon" | "note">; preview?: boolean }) {
  const body = <>
    <span className="link-icon"><Icon name={link.icon} /></span>
    <span className="link-text"><b>{link.title}</b>{link.note && <small>{link.note}</small>}</span>
    <span className="link-go"><Icon name="arrow" /></span>
  </>;
  const className = `link-btn ${toneOf(link.icon)}`;
  if (preview) return <span className={className} aria-hidden="true">{body}</span>;
  const external = !link.url.startsWith("/") && !link.url.startsWith("mailto:");
  return <a className={className} href={link.url} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{body}</a>;
}
