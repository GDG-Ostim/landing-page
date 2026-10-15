import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";

export const Route = createFileRoute("/")({ component: LandingPage });

const events = [
  { color: "blue", date: "06-08 Ekim 2026", title: "Kulüp Tanıtım Günleri", type: "Topluluk buluşması", place: "OSTİM Teknik Üniversitesi" },
  { color: "red", date: "04-05 Nisan 2026", title: "GDG On Campus Hackathon", type: "48 saatlik hackathon", place: "OSTİM Teknik Üniversitesi" },
  { color: "yellow", date: "24 Şubat 2026", title: "Engineerium '26", type: "Mühendislik zirvesi", place: "Konferans Salonu" },
];
const team = [
  { initials: "EY", name: "Ezel Yazıcı", role: "Kampüs Elçisi", color: "blue" },
  { initials: "MA", name: "Mehmet Ali İlhan", role: "Eş Lider", color: "red" },
  { initials: "YA", name: "Yusuf Türker Albayrak", role: "Teknik Koordinatör", color: "green" },
  { initials: "HA", name: "Hilal Akdağ", role: "Sosyal Medya ve Tasarım Lideri", color: "yellow" },
  { initials: "EG", name: "Emir Güzel", role: "Partnerlik Lideri", color: "blue" },
  { initials: "CC", name: "Ceyda Cesur", role: "Organizatör", color: "red" },
  { initials: "FO", name: "Fatih Tuğra Odabaş", role: "Organizasyon Koordinasyonu", color: "green" },
  { initials: "YK", name: "Yakup Kırdudu", role: "Ekip Üyesi", color: "yellow" },
  { initials: "HF", name: "Haya Firas", role: "Sosyal Medya ve Tasarım", color: "blue" },
  { initials: "KA", name: "Karya Elif Aksu", role: "Core Team", color: "red" },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <a className="brand" href="#top" aria-label="GDG Ostim Tech ana sayfa">
    <img src="/assets/gdg-mark-exact.png" alt="" width="70" height="70" />
    {!compact && <span>Google Developer Group<b>Ostim Tech</b></span>}
  </a>;
}

function PrincipleIcon({ type }: { type: "learn" | "share" | "build" }) {
  if (type === "learn") return <svg viewBox="0 0 56 56" aria-hidden="true"><path className="icon-blue" d="M7 12c8-2 15 0 21 5v29c-6-5-13-7-21-5Z"/><path className="icon-red" d="M49 12c-8-2-15 0-21 5v29c6-5 13-7 21-5Z"/><path d="M19 25l-5 4 5 4M37 25l5 4-5 4"/><path className="icon-yellow" d="M31 22l-6 14"/></svg>;
  if (type === "share") return <svg viewBox="0 0 56 56" aria-hidden="true"><path d="M16 18l23 10-23 10M39 28H26"/><circle className="icon-blue" cx="14" cy="18" r="6"/><circle className="icon-green" cx="42" cy="28" r="6"/><circle className="icon-red" cx="14" cy="39" r="6"/></svg>;
  return <svg viewBox="0 0 56 56" aria-hidden="true"><path className="icon-yellow" d="M28 6 47 17 28 28 9 17Z"/><path className="icon-blue" d="M9 17v22l19 11V28Z"/><path className="icon-green" d="M47 17v22L28 50V28Z"/><path d="M18 22v10l10 6 10-6V22"/></svg>;
}

function LandingPage() {
  const railRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  useEffect(() => { const close = () => setMenuOpen(false); window.addEventListener("resize", close); return () => window.removeEventListener("resize", close); }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js-motion");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotionEnabled(!reduceMotion);
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

    let frame = 0;
    const updateScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hero = heroRef.current;
        const video = videoRef.current;
        let heroProgress = 0;
        if (hero) {
          const rect = hero.getBoundingClientRect();
          heroProgress = Math.max(0, Math.min(-rect.top / Math.max(hero.offsetHeight - window.innerHeight, 1), 1));
        }
        if (video && Number.isFinite(video.duration) && video.duration > 0) {
          const target = heroProgress * Math.max(video.duration - 0.04, 0);
          if (Math.abs(video.currentTime - target) > 0.025) video.currentTime = target;
        }
        const pageProgress = window.scrollY / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        root.style.setProperty("--hero-progress", heroProgress.toFixed(3));
        root.style.setProperty("--page-progress", Math.min(pageProgress, 1).toFixed(3));
      });
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateScroll);
      cancelAnimationFrame(frame);
      root.classList.remove("js-motion");
    };
  }, []);
  const moveRail = (direction: number) => railRef.current?.scrollBy({ left: direction * 420, behavior: "smooth" });

  return <main id="top"><div className="scroll-progress" aria-hidden="true" />
    <header className="site-header"><BrandMark />
      <button className={`menu-toggle${menuOpen ? " is-open" : ""}`} type="button" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(open => !open)}>
        <span /><span /><span /><span className="sr-only">Menüyü aç</span>
      </button>
      <nav id="site-nav" className={menuOpen ? "nav-open" : ""} aria-label="Ana menü">
        <a href="#about" onClick={() => setMenuOpen(false)}>Hakkımızda</a><a href="#events" onClick={() => setMenuOpen(false)}>Etkinlikler</a>
        <a href="#team" onClick={() => setMenuOpen(false)}>Ekip</a><a className="nav-join" href="#join" onClick={() => setMenuOpen(false)}>Katıl <span>↗</span></a>
      </nav>
    </header>

    <section className="hero" ref={heroRef} aria-labelledby="hero-title">
      <div className="hero-sticky">
        <div className="hero-copy"><h1 id="hero-title"><span className="hero-title-desktop">Teknolojiyi<br/>birlikte üretiyoruz.</span><span className="hero-title-mobile">Kodla. Paylaş.<br/>Birlikte büyüt.</span></h1>
          <div className="hero-note"><p>Ankara'da öğrenen, paylaşan ve üreten geliştirici topluluğu.</p><a href="#events">Etkinlikleri keşfet <span aria-hidden="true">↓</span></a></div>
        </div>
        <figure className="hero-motion" aria-label="GDG işaretinin üç boyutlu hareketi">
          <video ref={videoRef} muted playsInline preload={motionEnabled ? "auto" : "none"} poster="/assets/hero-logo-poster.jpg">
            {motionEnabled && <source src="/assets/hero-logo-motion-mobile.mp4" type="video/mp4" media="(max-width: 560px)" />}
            {motionEnabled && <source src="/assets/hero-logo-motion.mp4" type="video/mp4" />}
          </video>
          <figcaption>Kaydırdıkça fikir parçaları bir araya gelir.</figcaption>
        </figure>
      </div>
    </section>

    <section className="about-section section-shell" id="about" aria-labelledby="about-title">
      <div className="parenthesis" aria-hidden="true">(</div><div className="about-content"><p className="section-index">GDG OSTIM TECH</p>
        <h2 id="about-title" data-reveal="up">Merakın buluştuğu yer.</h2>
        <p className="about-lead" data-reveal="up">Teknolojiye ilgi duyan insanları bir araya getiriyor, deneyimi açıkça paylaşıyor ve fikirleri birlikte çalışan projelere dönüştürüyoruz.</p>
        <div className="principles">
          <article data-reveal="left"><span className="principle-icon"><PrincipleIcon type="learn" /></span><h3>Birlikte öğren</h3><p>Workshop, konuşma ve çalışma gruplarıyla bilgiyi çoğalt.</p></article>
          <article data-reveal="right"><span className="principle-icon"><PrincipleIcon type="share" /></span><h3>Açıkça paylaş</h3><p>Deneyimini topluluğa aktar, yeni bakış açılarıyla karşılaş.</p></article>
          <article data-reveal="left"><span className="principle-icon"><PrincipleIcon type="build" /></span><h3>Birlikte üret</h3><p>Fikrini ekiple buluştur, çalışan bir ürüne dönüştür.</p></article>
        </div>
      </div><div className="parenthesis parenthesis-right" aria-hidden="true">)</div>
    </section>

    <section className="manifesto section-shell" aria-labelledby="manifesto-title">
      <div className="manifesto-copy"><h2 id="manifesto-title"><span data-reveal="left">Öğren.</span><span data-reveal="right">Paylaş.</span><span data-reveal="left">Birlikte üret.</span></h2><p data-reveal="up">Farklı disiplinlerden gelen insanların aynı masa etrafında buluştuğu açık bir üretim kültürü.</p></div>
      <div className="signal-map" aria-label="Topluluk yaklaşımı">
        {[["Öğren","Bilgiyi erişilebilir kıl","blue"],["Paylaş","Deneyimi dolaşıma sok","red"],["Üret","Fikirleri birlikte dene","yellow"],["Etki","Yerelden geleceğe bağlan","green"]].map(([title,text,color],index) =>
          <div className={`signal-row ${color}`} data-reveal="right" style={{ "--delay": `${index * 85}ms` } as CSSProperties} key={title}><span>0{index+1}</span><strong>{title}</strong><p>{text}</p><i aria-hidden="true" /></div>
        )}
      </div>
    </section>

    <section className="events-section section-shell" id="events" aria-labelledby="events-title">
      <div className="events-head" data-reveal="up"><div><p className="section-index">SON ETKİNLİKLER</p><h2 id="events-title">Birlikte öğrenmenin takvimi.</h2></div>
        <div className="rail-controls" aria-label="Etkinlik kartlarını kaydır"><button type="button" onClick={() => moveRail(-1)} aria-label="Önceki etkinlik">←</button><button type="button" onClick={() => moveRail(1)} aria-label="Sonraki etkinlik">→</button></div>
      </div>
      <div className="events-rail" ref={railRef}>
        {events.map((event,index) => <article className={`event-card ${event.color}`} data-reveal="up" style={{ "--delay": `${index * 110}ms` } as CSSProperties} key={event.title}>
          <div className="event-art"><span>{String(index+1).padStart(2,"0")}</span><div className="event-building" /></div>
          <div className="event-info"><time>{event.date}</time><h3>{event.title}</h3><p>{event.type}</p><span>{event.place}</span></div>
        </article>)}
        <a className="event-follow" href="https://tr.linkedin.com/company/ostimtech-gdsc" target="_blank" rel="noreferrer"><span>Duyuruları LinkedIn'de takip et</span><b>↗</b></a>
      </div>
    </section>

    <section className="team-section section-shell" id="team" aria-labelledby="team-title">
      <div className="team-intro" data-reveal="up"><p className="section-index">EKİP / 10</p><h2 id="team-title">Bu topluluğu birlikte büyütüyoruz.</h2><p>Etkinlikten içeriğe, her buluşmanın arkasında gönüllü bir ekip var.</p></div>
      <div className="team-grid">{team.map((member,index) => <article className={`team-card ${member.color}`} data-reveal="up" style={{ "--delay": `${(index % 3) * 70}ms` } as CSSProperties} key={member.name}>
        <div className="member-visual"><span>{member.initials}</span><i>{String(index+1).padStart(2,"0")}</i></div><h3>{member.name}</h3><p>{member.role}</p>
      </article>)}</div>
    </section>

    <section className="join-section" id="join" aria-labelledby="join-title"><div className="join-wire wire-a" /><div className="join-wire wire-b" /><div className="join-wire wire-c" /><div className="join-wire wire-d" />
      <div className="join-inner"><h2 id="join-title" data-reveal="up">Sıradaki fikre birlikte başlayalım.</h2><p data-reveal="up">Yeni insanlarla tanış, öğrendiklerini paylaş ve üretim ekibine katıl.</p>
        <a className="join-link" href="https://tr.linkedin.com/company/ostimtech-gdsc" target="_blank" rel="noreferrer"><span>Topluluğa katıl</span><b aria-hidden="true">↗</b></a>
      </div>
    </section>
    <footer><div className="footer-main"><BrandMark /><div className="footer-links"><a href="#about">Hakkımızda</a><a href="#events">Etkinlikler</a><a href="#team">Ekip</a><a href="https://tr.linkedin.com/company/ostimtech-gdsc" target="_blank" rel="noreferrer">LinkedIn ↗</a></div></div>
      <div className="footer-bottom"><span>© 2026 GDG Ostim Tech</span><span>Ankara, Türkiye</span></div><div className="color-rule" aria-hidden="true"><i /><i /><i /><i /></div>
    </footer>
  </main>;
}
