// Every outbound community link lives here (navbar, footer and /links all read it).
// Icons are Tabler outline glyphs (MIT), inlined so they need no extra request.

export type IconName = "instagram" | "linkedin" | "mail" | "whatsapp" | "world" | "users" | "arrow";

const paths: Record<IconName, string[]> = {
  instagram: ["M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z", "M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", "M16.5 7.5v.01"],
  linkedin: ["M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z", "M8 11v5", "M8 8v.01", "M12 16v-5", "M16 16v-3a2 2 0 0 0 -4 0"],
  mail: ["M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z", "M3 7l9 6l9 -6"],
  whatsapp: ["M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9", "M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1"],
  world: ["M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0", "M3.6 9h16.8", "M3.6 15h16.8", "M11.5 3a17 17 0 0 0 0 18", "M12.5 3a17 17 0 0 1 0 18"],
  users: ["M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0", "M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1", "M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0", "M17 10h2a2 2 0 0 1 2 2v1", "M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0", "M3 13v-1a2 2 0 0 1 2 -2h2"],
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
