import { createFileRoute } from "@tanstack/react-router";
import { asset } from "../lib/asset";
import { Icon, SocialTiles, links, type IconName } from "../lib/social";

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

function LinkButton({ href, icon, title, note, tone, external = true }: { href: string; icon: IconName; title: string; note: string; tone: string; external?: boolean }) {
  return <a className={`link-btn ${tone}`} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
    <span className="link-icon"><Icon name={icon} /></span>
    <span className="link-text"><b>{title}</b><small>{note}</small></span>
    <span className="link-go"><Icon name="arrow" /></span>
  </a>;
}

function LinksPage() {
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
        <LinkButton href={links.join} icon="users" tone="red" title="Bize katılmayı unutmayın!" note="GDG Community'de üye ol, etkinlik duyurularını al" />
        <div className="links-group">
          <p>WhatsApp topluluklarımız · <b>sadece birine katılman yeterli</b></p>
          {links.whatsapp.map(group => <LinkButton href={group.href} icon="whatsapp" tone="green" title={group.label} note="WhatsApp topluluğu · ücretsiz" key={group.href} />)}
        </div>
        <LinkButton href="/" icon="world" tone="blue" title="Web sitemiz" note="gdgostimtech.com" external={false} />
      </section>
    </div>

    <footer className="links-foot">
      <a href="https://veriteknik.com" target="_blank" rel="noopener">VeriTeknik</a> desteğiyle · © 2026 GDG Ostim Tech
    </footer>
  </main>;
}
