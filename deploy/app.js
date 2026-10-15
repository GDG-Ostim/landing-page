// Static-export runtime for gdgostimtech.com. Mirrors the React page's effects
// (header border, mobile menu, scroll reveal, on-screen video playback) so the
// prerendered HTML works without shipping the React bundle.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header border only once the page has moved.
  var topbar = document.querySelector(".topbar");
  function onScroll() { if (topbar) topbar.classList.toggle("is-scrolled", window.scrollY > 8); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Mobile menu.
  var menuBtn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
    nav.classList.toggle("is-open", open);
  }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    nav.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { setMenu(false); }); });
    window.addEventListener("resize", function () { if (window.innerWidth > 900) setMenu(false); });
  }

  var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
  videos.forEach(function (video) { video.muted = true; });

  if (reduceMotion) {
    // Posters stay as stills.
    videos.forEach(function (video) { video.removeAttribute("autoplay"); video.pause(); });
    return;
  }

  // Scroll reveal: a soft rise, once.
  root.classList.add("js-motion");
  var reveal = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); reveal.unobserve(entry.target); }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-reveal]").forEach(function (el) { reveal.observe(el); });

  // Mascot loops only play while on screen; the hero autoplays.
  var loops = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var video = entry.target;
      if (entry.isIntersecting) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      else video.pause();
    });
  }, { threshold: 0.25 });
  document.querySelectorAll(".loop-art video").forEach(function (video) { loops.observe(video); });
})();
