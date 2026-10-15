import { createFileRoute } from "@tanstack/react-router";
import { asset } from "../lib/asset";
import { LinkCard, SocialTiles, useCommunityLinks, type CommunityLink } from "../lib/social";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "Linkler · GDG Ostim Tech" },
      { name: "description", content: "GDG Ostim Tech topluluğuna katıl: WhatsApp toplulukları, GDG Community, Instagram ve LinkedIn." },
      { property: "og:url", content: "https://gdgostimtech.com/links" },
    ],
  }),
  component: LinksPage,
});

/** Consecutive WhatsApp cards share one green box, as the page was designed. */
function groupLinks(items: CommunityLink[]) {
  const groups: CommunityLink[][] = [];
  for (const link of items) {
    const last = groups.at(-1);
    if (link.icon === "whatsapp" && last?.[0].icon === "whatsapp") last.push(link);
    else groups.push([link]);
  }
  return groups;
}

function LinksPage() {
  const groups = groupLinks(useCommunityLinks());
  return <main className="links-page">
    <header className="links-head">
      <a className="links-logo" href="/" aria-label="GDG Ostim Tech ana sayfa">
        <img src={asset("/assets/gdg-mark-exact.png")} alt="" width="70" height="70" />
      </a>
      <h1>GDG OstimTech</h1>
      <p>Google Developer Groups on Campus · OSTİM Teknik Üniversitesi</p>
      <SocialTiles className="links-social" />
    </header>

    <div className="links-stage">
      {/* The mascot sits on the card's top edge; its legs hang in front of the card. */}
      <picture className="links-mascot" aria-hidden="true">
        <source srcSet={asset("/assets/links-mascot-still.webp")} media="(prefers-reduced-motion: reduce)" />
        <img src={asset("/assets/links-mascot.webp")} alt="" width="420" height="543" />
      </picture>
      <section className="links-card" aria-label="Topluluk linkleri">
        {groups.map(group => group.length > 1
          ? <div className="links-group" key={group[0].id}>
              <p>WhatsApp topluluklarımız · <b>sadece birine katılman yeterli</b></p>
              {group.map(link => <LinkCard link={link} key={link.id} />)}
            </div>
          : <LinkCard link={group[0]} key={group[0].id} />)}
      </section>
    </div>

    <footer className="links-foot">
      <a href="https://veriteknik.com" target="_blank" rel="noopener">VeriTeknik</a> desteğiyle · © 2026 GDG Ostim Tech
    </footer>
  </main>;
}
