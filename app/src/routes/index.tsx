import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { asset } from "../lib/asset";
import { Icon, SocialTiles, links, useSocial } from "../lib/social";
import { EventCard, useEvents } from "../lib/events";

export const Route = createFileRoute("/")({ component: LandingPage });

const about = [
  { id: "open", title: "Herkese açık, tamamen ücretsiz.", text: "Bölümün, sınıfın ya da deneyimin fark etmez. Etkinliklerimiz teknolojiye merak duyan herkese açık ve ücretsiz." },
  { id: "learn", title: "Birlikte öğren.", text: "Workshop'lar, çalışma grupları ve eğitim serileriyle Android'den yapay zekâya, web'den buluta yeni şeyler öğren." },
  { id: "share", title: "Açıkça paylaş.", text: "Öğrendiğini anlat, konuşma yap, deneyimini toplulukla paylaş. Her sunum bir sonraki kişiye ilham olur." },
  { id: "build", title: "Birlikte üret.", text: "Hackathon'larda ve proje ekiplerinde fikrini takımla buluştur, çalışan bir ürüne dönüştür." },
];
const tracks = ["Android", "Flutter", "Web", "Cloud", "Yapay Zekâ", "Firebase", "UI/UX", "Oyun Geliştirme"];
const chipColors = ["blue", "red", "yellow", "green"];
const stickers = ["phone", "browser", "cloud", "ai", "game", "palette"];
// `avatar` is the member's mascot-style portrait (public/assets/team/*.webp); until then the card shows initials.
const team: { initials: string; name: string; role: string; color: string; avatar?: string }[] = [
  { initials: "MA", name: "Mehmet Ali İlhan", role: "Başkan Yardımcısı", color: "red", avatar: "/assets/team/mehmet.webp" },
  { initials: "EY", name: "Ezel Yazıcı", role: "Topluluk Başkanı", color: "blue", avatar: "/assets/team/ezel.webp" },
  { initials: "PA", name: "Poyraz Avsever", role: "Teknoloji Komitesi Başkanı", color: "green", avatar: "/assets/team/poyraz.webp" },
  { initials: "YA", name: "Yusuf Türker Albayrak", role: "Teknoloji Komitesi Başkan Yardımcısı", color: "green", avatar: "/assets/team/yusuf.webp" },
  { initials: "HA", name: "Hilal Akdağ", role: "Sosyal Medya", color: "yellow", avatar: "/assets/team/hilal.webp" },
  { initials: "BK", name: "Begüm Kocabıçakoğlu", role: "Sosyal Medya", color: "yellow", avatar: "/assets/team/begum.webp" },
  { initials: "EG", name: "Emir Güzel", role: "Partnerlik Lideri", color: "blue", avatar: "/assets/team/emir.webp" },
  { initials: "FO", name: "Fatih Tuğra Odabaş", role: "Organizasyon", color: "red", avatar: "/assets/team/fatih.webp" },
];

function Logo() {
  return <a className="logo" href="#top" aria-label="GDG Ostim Tech ana sayfa">
    <img src={asset("/assets/gdg-mark-exact.png")} alt="" width="70" height="70" />
    <span>Ostim Tech<small>Google Developer Group</small></span>
  </a>;
}

/** Short mascot loop that only plays while on screen; a still for reduced motion. */
function LoopArt({ name }: { name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); return; }
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.25 });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return <div className="loop-art">
    {still
      ? <img src={asset(`/assets/${name}.webp`)} alt="" width="720" height="720" loading="lazy" />
      : <video ref={ref} muted loop playsInline preload="none" poster={asset(`/assets/${name}.webp`)} aria-hidden="true">
          <source src={asset(`/assets/${name}.webm`)} type="video/webm" />
          <source src={asset(`/assets/${name}.mp4`)} type="video/mp4" />
        </video>}
  </div>;
}

/** "Follow announcements" opens the LinkedIn page managed in the admin panel. */
function FollowButton() {
  return <a className="btn btn-blue" href={useSocial().linkedin} target="_blank" rel="noreferrer">Duyuruları takip et</a>;
}

function Chevron({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={back ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} /></svg>;
}

/**
 * Events from the admin panel as a horizontal rail: arrows on desktop (only when the
 * cards overflow), native swipe on touch, arrow/Home/End keys on the focused track.
 */
function EventsSlider() {
  const events = useEvents();
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const update = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    setEdges({ start: element.scrollLeft <= 4, end: element.scrollLeft >= max - 4 });
  }, []);
  // When the live list replaces the seed, scroll snapping would keep the old first card
  // in view; a new order always starts from the first card instead.
  const order = events.map(event => event.id).join(",");
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    element.scrollLeft = 0;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [update, order]);

  const smooth = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  function step(direction: 1 | -1) {
    const element = track.current;
    const card = element?.querySelector<HTMLElement>(".event");
    if (!element || !card) return;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: smooth() });
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const element = track.current;
    if (!element || event.target !== element) return;
    const actions: Record<string, () => void> = {
      ArrowRight: () => step(1), ArrowLeft: () => step(-1),
      Home: () => element.scrollTo({ left: 0, behavior: smooth() }),
      End: () => element.scrollTo({ left: element.scrollWidth, behavior: smooth() }),
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  }

  if (!events.length) return <div className="events-empty">
    <b>Yeni etkinlikler çok yakında!</b>
    <p>Takvim hazırlanıyor. Duyuruları kaçırmamak için bizi takip et.</p>
  </div>;
  const scrollable = !(edges.start && edges.end);
  return <div className={`events-slider${scrollable ? " is-scrollable" : ""}`}>
    {scrollable && <button className="events-arrow is-prev" onClick={() => step(-1)} disabled={edges.start} aria-label="Önceki etkinlikler" aria-controls="events-track"><Chevron back /></button>}
    <div id="events-track" className="events-track" ref={track} onScroll={update} onKeyDown={onKey}
      role="region" aria-label="Etkinlikler" tabIndex={scrollable ? 0 : undefined}>
      {events.map((event, index) => <EventCard event={event} index={index} key={event.id} />)}
    </div>
    {scrollable && <button className="events-arrow is-next" onClick={() => step(1)} disabled={edges.end} aria-label="Sonraki etkinlikler" aria-controls="events-track"><Chevron /></button>}
  </div>;
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    // The header border only appears once the page has moved.
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { const close = () => { if (window.innerWidth > 900) setMenuOpen(false); }; window.addEventListener("resize", close); return () => window.removeEventListener("resize", close); }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-motion");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduceMotion) {
      revealItems.forEach(item => item.classList.add("is-visible"));
      return () => root.classList.remove("js-motion");
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach(item => observer.observe(item));

    return () => {
      observer.disconnect();
      root.classList.remove("js-motion");
    };
  }, []);

  return <main id="top">
    <header className={`topbar${scrolled ? " is-scrolled" : ""}`}>
      <div className="topbar-inner">
        <Logo />
        <button className="menu-btn" type="button" aria-expanded={menuOpen} aria-controls="site-nav" aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"} onClick={() => setMenuOpen(open => !open)}><i /><i /><i /></button>
        <nav id="site-nav" className={`topnav${menuOpen ? " is-open" : ""}`} aria-label="Ana menü">
          <a href="#about" onClick={() => setMenuOpen(false)}>Hakkımızda</a>
          <a href="#events" onClick={() => setMenuOpen(false)}>Etkinlikler</a>
          <a href="#team" onClick={() => setMenuOpen(false)}>Ekip</a>
          <SocialTiles className="nav-social" />
          <a className="btn btn-sm" href="#join" onClick={() => setMenuOpen(false)}>Katıl</a>
        </nav>
      </div>
    </header>

    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <div className="hero-art">
          {reduceMotion
            ? <img src={asset("/assets/hero-dragon.webp")} alt="" width="960" height="960" />
            : <video autoPlay muted loop playsInline preload="auto" poster={asset("/assets/hero-dragon.webp")} aria-hidden="true">
                <source src={asset("/assets/hero-dragon.webm")} type="video/webm" />
                <source src={asset("/assets/hero-dragon.mp4")} type="video/mp4" />
              </video>}
        </div>
        <div className="hero-copy">
          <h1 id="hero-title">Teknolojiyi <em>birlikte</em> öğren, paylaş ve üret!</h1>
          <p className="hero-lead">Ankara'da öğrenen, paylaşan ve üreten geliştiricilerin topluluğu. Etkinliklere katıl, ekibe dahil ol.</p>
          <div className="hero-actions">
            <a className="btn btn-block" href="#join">Topluluğa katıl</a>
            <a className="btn btn-secondary btn-block" href="#events">Etkinlikleri gör</a>
          </div>
        </div>
      </div>
    </section>

    <section className="about" id="about" aria-labelledby="about-title">
      <h2 id="about-title" className="sr-only">Hakkımızda</h2>
      {about.map(item => <article className="about-row" data-reveal="up" key={item.id}>
        <LoopArt name={`about-${item.id}`} />
        <div className="about-copy"><h3>{item.title}</h3><p>{item.text}</p></div>
      </article>)}
    </section>

    <section className="tracks" aria-labelledby="tracks-title">
      {stickers.map(name => <img className={`sticker sticker-${name}`} src={asset(`/assets/sticker-${name}.webp`)} alt="" aria-hidden="true" width="320" height="320" loading="lazy" key={name} />)}
      <div className="tracks-inner" data-reveal="up">
        <div className="tracks-mascot"><LoopArt name="tracks-fly" /></div>
        <h2 id="tracks-title">Hangi alanda üretmek istersen.</h2>
        <p>Mobilden buluta, yapay zekâdan tasarıma; her alandan insanla aynı masada buluş.</p>
        <ul className="track-chips" aria-label="Çalışma alanları">
          {tracks.map((track, index) => <li className={chipColors[index % chipColors.length]} key={track}>{track}</li>)}
        </ul>
      </div>
    </section>

    <section className="events" id="events" aria-labelledby="events-title">
      <div className="events-head" data-reveal="up">
        <h2 id="events-title">Birlikte öğrenmenin takvimi.</h2>
        <p>Son etkinliklerimizden birkaçı. Sıradakini kaçırmamak için duyurularımızı takip et.</p>
      </div>
      <div className="events-stage" data-reveal="up"><EventsSlider /></div>
      <div className="events-cta"><FollowButton /></div>
    </section>

    <section className="team" id="team" aria-labelledby="team-title">
      <div className="team-head" data-reveal="up">
        <h2 id="team-title">Bu topluluğu birlikte büyütüyoruz.</h2>
        <p>Etkinlikten içeriğe, her buluşmanın arkasında gönüllü bir ekip var.</p>
      </div>
      <div className="team-grid">
        {team.map((member, index) => <article className={`member ${member.color}`} data-reveal="up" style={{ "--delay": `${(index % 5) * 60}ms` } as CSSProperties} key={member.name}>
          <div className="member-avatar">
            {member.avatar
              ? <img src={asset(member.avatar)} alt="" width="320" height="320" loading="lazy" />
              : <span aria-hidden="true">{member.initials}</span>}
          </div>
          <h3>{member.name}</h3>
          <p>{member.role}</p>
        </article>)}
      </div>
    </section>

    <section className="join" id="join" aria-labelledby="join-title">
      <div className="join-inner" data-reveal="up">
        <h2 id="join-title">Sıradaki fikre <em>birlikte</em> başlayalım.</h2>
        <p>Yeni insanlarla tanış, öğrendiklerini paylaş ve üretim ekibine katıl.</p>
        <div className="join-actions">
          <a className="btn" href={links.join} target="_blank" rel="noreferrer">Topluluğa katıl</a>
          <a className="btn btn-secondary" href="/links">Tüm linkler</a>
        </div>
      </div>
      <div className="join-art"><LoopArt name="join-cheer" /></div>
      <svg className="join-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 64C180 104 360 112 540 84S900 8 1080 20s300 60 360 72V120H0Z" /></svg>
    </section>
    <footer className="footer">
      <div className="footer-inner">
        <a className="sponsor" href="https://veriteknik.com" target="_blank" rel="noopener" aria-label="Sponsorumuz VeriTeknik — veriteknik.com">
          <div><p className="footer-label">Sponsorumuz</p><p className="sponsor-text">Topluluğumuzu destekleyen VeriTeknik'e teşekkür ederiz.</p></div>
          <span className="sponsor-logo"><img src={asset("/assets/veriteknik-logo.png")} alt="VeriTeknik" width="720" height="161" loading="lazy" /><i aria-hidden="true">↗</i></span>
        </a>
        <div className="footer-cols">
          <div className="footer-brand">
            <a className="footer-logo" href="#top" aria-label="GDG Ostim Tech ana sayfa"><img src={asset("/assets/gdg-mark-exact.png")} alt="" width="70" height="70" /><span>Ostim Tech<small>Google Developer Group</small></span></a>
            <p>OSTİM Teknik Üniversitesi'nde öğrenen, paylaşan ve üreten geliştiricilerin topluluğu.</p>
          </div>
          <nav aria-label="Alt menü"><p className="footer-label">Topluluk</p><a href="#about">Hakkımızda</a><a href="#events">Etkinlikler</a><a href="#team">Ekip</a><a href="#join">Katıl</a></nav>
          <div><p className="footer-label">Takip et</p><SocialTiles className="footer-social" /><a href={links.whatsapp[0].href} target="_blank" rel="noreferrer"><Icon name="whatsapp" />WhatsApp topluluğu</a><a href="/links"><Icon name="arrow" />Tüm linkler</a></div>
        </div>
        <div className="footer-bottom"><span>© 2026 GDG Ostim Tech</span><span>Ankara, Türkiye</span></div>
      </div>
      <div className="color-rule" aria-hidden="true"><i /><i /><i /><i /></div>
    </footer>
  </main>;
}
