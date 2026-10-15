import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({ component: LandingPage });

const events = [
  { color: "blue", date: "06-08 Ekim 2026", title: "Kulüp Tanıtım Günleri", type: "Topluluk buluşması", place: "OSTİM Teknik Üniversitesi" },
  { color: "red", date: "04-05 Nisan 2026", title: "GDG On Campus Hackathon", type: "48 saatlik hackathon", place: "OSTİM Teknik Üniversitesi" },
  { color: "yellow", date: "24 Şubat 2026", title: "Engineerium '26", type: "Mühendislik zirvesi", place: "Konferans Salonu" },
];
const team = [
  { initials: "EY", name: "Ezel Yazıcı", role: "Kampüs Elçisi", color: "blue" },
  { initials: "YA", name: "Yusuf Türker Albayrak", role: "Teknik Koordinatör", color: "green" },
  { initials: "CT", name: "Core Team", role: "Organizasyon ve topluluk", color: "red" },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <a className="brand" href="#top" aria-label="GDG Ostim Tech ana sayfa">
    <img src="/assets/gdg-mark.png" alt="" width="70" height="70" />
    {!compact && <span>Google Developer Group<b>Ostim Tech</b></span>}
  </a>;
}

function CircuitLines() {
  return <svg className="circuit-lines" viewBox="0 0 900 720" aria-hidden="true">
    <path className="circuit blue-line" d="M70 95H355l78 78h190l80 80h125" />
    <path className="circuit red-line" d="M22 260h250l70 70h185l90 90h220" />
    <path className="circuit yellow-line" d="M82 520h270l74-74h166l80-80h160" />
    <path className="circuit green-line" d="M172 665h218l86-86h116l86-86h154" />
    <circle cx="70" cy="95" r="10" className="node blue-stroke" /><circle cx="22" cy="260" r="10" className="node red-stroke" />
    <circle cx="82" cy="520" r="10" className="node yellow-stroke" /><circle cx="172" cy="665" r="10" className="node green-stroke" />
  </svg>;
}

function LandingPage() {
  const railRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const close = () => setMenuOpen(false); window.addEventListener("resize", close); return () => window.removeEventListener("resize", close); }, []);
  const moveRail = (direction: number) => railRef.current?.scrollBy({ left: direction * 420, behavior: "smooth" });

  return <main id="top">
    <header className="site-header"><BrandMark />
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(open => !open)}>
        <span /><span /><span /><span className="sr-only">Menüyü aç</span>
      </button>
      <nav id="site-nav" className={menuOpen ? "nav-open" : ""} aria-label="Ana menü">
        <a href="#about" onClick={() => setMenuOpen(false)}>Hakkımızda</a><a href="#events" onClick={() => setMenuOpen(false)}>Etkinlikler</a>
        <a href="#team" onClick={() => setMenuOpen(false)}>Ekip</a><a className="nav-join" href="#join" onClick={() => setMenuOpen(false)}>Katıl <span>↗</span></a>
      </nav>
    </header>

    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-grid" aria-hidden="true" />
      <figure className="hero-visual"><img src="/assets/hero.webp" alt="Mavi, kırmızı, sarı ve yeşil parçalarla oluşturulmuş teknoloji yerleştirmesi" /></figure>
      <div className="corner corner-blue" /><div className="corner corner-red" /><div className="corner corner-yellow" /><div className="corner corner-green" />
      <div className="hero-copy"><h1 id="hero-title"><span>Teknolojiyi</span><span>birlikte üretiyoruz.</span></h1>
        <div className="hero-note"><p>Ankara'da öğrenen, paylaşan ve üreten geliştirici topluluğu.</p><a href="#events">Etkinlikleri keşfet <span aria-hidden="true">↓</span></a></div>
      </div><CircuitLines />
    </section>

    <section className="about-section section-shell" id="about" aria-labelledby="about-title">
      <div className="parenthesis" aria-hidden="true">(</div><div className="about-content"><p className="section-index">GDG OSTIM TECH</p>
        <h2 id="about-title">Merakın buluştuğu yer.</h2>
        <p className="about-lead">Teknolojiye ilgi duyan insanları bir araya getiriyor, deneyimi açıkça paylaşıyor ve fikirleri birlikte çalışan projelere dönüştürüyoruz.</p>
        <div className="principles">
          <article><span>01</span><h3>Birlikte öğren</h3><p>Workshop, konuşma ve çalışma gruplarıyla bilgiyi çoğalt.</p></article>
          <article><span>02</span><h3>Açıkça paylaş</h3><p>Deneyimini topluluğa aktar, yeni bakış açılarıyla karşılaş.</p></article>
          <article><span>03</span><h3>Birlikte üret</h3><p>Fikrini ekiple buluştur, çalışan bir ürüne dönüştür.</p></article>
        </div>
      </div><div className="parenthesis parenthesis-right" aria-hidden="true">)</div>
    </section>

    <section className="manifesto section-shell" aria-labelledby="manifesto-title">
      <div className="manifesto-copy"><h2 id="manifesto-title"><span>Öğren.</span><span>Paylaş.</span><span>Birlikte üret.</span></h2><p>Farklı disiplinlerden gelen insanların aynı masa etrafında buluştuğu açık bir üretim kültürü.</p></div>
      <div className="signal-map" aria-label="Topluluk yaklaşımı">
        {[["Öğren","Bilgiyi erişilebilir kıl","blue"],["Paylaş","Deneyimi dolaşıma sok","red"],["Üret","Fikirleri birlikte dene","yellow"],["Etki","Yerelden geleceğe bağlan","green"]].map(([title,text,color],index) =>
          <div className={`signal-row ${color}`} key={title}><span>0{index+1}</span><strong>{title}</strong><p>{text}</p><i aria-hidden="true" /></div>
        )}
      </div>
    </section>

    <section className="events-section section-shell" id="events" aria-labelledby="events-title">
      <div className="events-head"><div><p className="section-index">SON ETKİNLİKLER</p><h2 id="events-title">Birlikte öğrenmenin takvimi.</h2></div>
        <div className="rail-controls" aria-label="Etkinlik kartlarını kaydır"><button type="button" onClick={() => moveRail(-1)} aria-label="Önceki etkinlik">←</button><button type="button" onClick={() => moveRail(1)} aria-label="Sonraki etkinlik">→</button></div>
      </div>
      <div className="events-rail" ref={railRef}>
        {events.map((event,index) => <article className={`event-card ${event.color}`} key={event.title}>
          <div className="event-art"><span>{String(index+1).padStart(2,"0")}</span><div className="event-building" /></div>
          <div className="event-info"><time>{event.date}</time><h3>{event.title}</h3><p>{event.type}</p><span>{event.place}</span></div>
        </article>)}
        <a className="event-follow" href="https://tr.linkedin.com/company/ostimtech-gdsc" target="_blank" rel="noreferrer"><span>Duyuruları LinkedIn'de takip et</span><b>↗</b></a>
      </div>
    </section>

    <section className="team-section section-shell" id="team" aria-labelledby="team-title">
      <div className="team-intro"><p className="section-index">EKİP</p><h2 id="team-title">Bu topluluğu birlikte büyütüyoruz.</h2><p>Etkinlikten içeriğe, her buluşmanın arkasında gönüllü bir ekip var.</p></div>
      <div className="team-grid">{team.map((member,index) => <article className={`team-card ${member.color}`} key={member.name}>
        <div className="member-visual"><span>{member.initials}</span><i>{String(index+1).padStart(2,"0")}</i></div><h3>{member.name}</h3><p>{member.role}</p>
      </article>)}</div>
    </section>

    <section className="join-section" id="join" aria-labelledby="join-title"><div className="join-wire wire-a" /><div className="join-wire wire-b" /><div className="join-wire wire-c" /><div className="join-wire wire-d" />
      <div className="join-inner"><h2 id="join-title">Sıradaki fikre birlikte başlayalım.</h2><p>Yeni insanlarla tanış, öğrendiklerini paylaş ve üretim ekibine katıl.</p>
        <a className="join-link" href="https://tr.linkedin.com/company/ostimtech-gdsc" target="_blank" rel="noreferrer"><span>Topluluğa katıl</span><b aria-hidden="true">↗</b></a>
      </div>
    </section>
    <footer><div className="footer-main"><BrandMark /><div className="footer-links"><a href="#about">Hakkımızda</a><a href="#events">Etkinlikler</a><a href="#team">Ekip</a><a href="https://tr.linkedin.com/company/ostimtech-gdsc" target="_blank" rel="noreferrer">LinkedIn ↗</a></div></div>
      <div className="footer-bottom"><span>© 2026 GDG Ostim Tech</span><span>Ankara, Türkiye</span></div><div className="color-rule" aria-hidden="true"><i /><i /><i /><i /></div>
    </footer>
  </main>;
}
