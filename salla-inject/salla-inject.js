/* ==========================================================================
   TAJ ALAMEERA — Salla Storefront Injection Bundle
   Paste this whole file into: Store Design → Advanced → Customize with JavaScript
   It injects: (1) brand styles + gold-ticker CSS, (2) live gold-price ticker
   fed by the Cloudflare proxy, refreshing every 60s.
   ========================================================================== */
(function () {
  "use strict";

  /* ====== Image URLs (jsDelivr CDN, from GitHub repo) ====== */
  var CDN = "https://cdn.jsdelivr.net/gh/moalmohtasib/taj-alameera-vip@master/salla-inject/media/";
  var MEDIA = {
    heroWebp:   CDN + "hero.webp",
    heroPoster: CDN + "hero-poster.jpg",
    rings:    CDN + "Rings.webp",
    bracelets:CDN + "Bracelets.webp",
    chains:   CDN + "Chains.webp",
    kids:     CDN + "Kids.webp",
    goldbars: CDN + "Gold-Bars.webp"
  };
  /* ======================================================== */

  var PROXY_URL = "https://taj-gold-proxy.tajalamerahost.workers.dev/";
  var REFRESH_MS = 60 * 1000; // 1 minute
  var SAR_SVG = CDN + "Saudi_Riyal_Symbol.svg";

  /* ---------- 1. Inject styles ---------- */
  var CSS = [
    "@import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');",
    ":root{--brand-gold:#C5A059;--brand-dark:#0B0B0B;--text-main:#1d2939;--text-light:#fff;--border-hex:#E6E8EB;--soft-cream:#F9F7F2;--apple-gray:#E6E8EB;--text-muted:#667085;}",
    "body{font-family:'Almarai',sans-serif !important;}",
    ".has-taj-ticker{padding-top:46px !important;}",
    ".taj-ticker-wrap{position:fixed;top:0;left:0;width:100%;height:46px;background:var(--soft-cream);display:flex;align-items:center;overflow:hidden;z-index:999999;border-bottom:1px solid var(--border-hex);direction:ltr;}",
    ".taj-track{display:flex;width:max-content;animation:tajScroll 45s linear infinite;}",
    ".taj-ticker-wrap:hover .taj-track{animation-play-state:paused;}",
    "@keyframes tajScroll{from{transform:translateX(0);}to{transform:translateX(-50%);}}",
    ".taj-group{display:flex;align-items:center;}",
    ".taj-item{display:flex;align-items:center;flex-direction:row-reverse;gap:12px;padding:0 35px;font-family:'Almarai',sans-serif;font-size:14px;color:var(--text-main);white-space:nowrap;}",
    ".taj-item strong{font-weight:800;font-size:16px;direction:ltr;display:flex;align-items:center;}",
    ".taj-sar-icon{display:inline-block;width:16px;height:16px;margin-right:8px;background-color:currentColor;-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;}",
    ".taj-label{color:var(--brand-gold);font-weight:700;}",
    ".up{color:#2D8A39;}.down{color:#D93025;}",
    ".taj-pulse{display:inline-block;width:8px;height:8px;background-color:var(--brand-gold);border-radius:50%;position:relative;}",
    ".taj-pulse::after{content:'';position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;border-radius:50%;border:1px solid var(--brand-gold);animation:pulseRing 2s infinite;}",
    "@keyframes pulseRing{0%{transform:scale(0.5);opacity:0;}50%{opacity:1;}100%{transform:scale(1.5);opacity:0;}}",
    ".taj-time{font-size:12px;opacity:0.6;color:var(--text-muted);border-left:1px solid var(--border-hex);padding-left:15px;margin-left:10px;}",
    "@media (max-width:768px){.taj-ticker-wrap{height:40px;}.has-taj-ticker{padding-top:40px !important;}.taj-item{padding:0 15px;font-size:12px;}}"
  ].join("\n");

  function injectStyles() {
    if (document.getElementById("taj-inject-css")) return;
    var s = document.createElement("style");
    s.id = "taj-inject-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- 2. Gold ticker ---------- */
  var TajGoldTicker = {
    prev: null, // previous 24k value, to decide up/down arrow color

    start: function () {
      var self = this;
      self.tick();
      setInterval(function () { self.tick(); }, REFRESH_MS);
    },

    tick: function () {
      var self = this;
      fetch(PROXY_URL, { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data || !data.ok || !data.prices) { self.render(null); return; }
          self.render(data);
        })
        .catch(function () { self.render(null); });
    },

    render: function (data) {
      var p24 = "...", p21 = "...", p18 = "...";
      var arrow = "", colorClass = "up", timeStr = "يتم التحديث";

      if (data && data.prices) {
        p24 = Number(data.prices["24k"]).toFixed(2);
        p21 = Number(data.prices["21k"]).toFixed(2);
        p18 = Number(data.prices["18k"]).toFixed(2);

        var cur = parseFloat(data.prices["24k"]);
        var up = this.prev === null ? true : cur >= this.prev;
        this.prev = cur;
        arrow = up ? "▲" : "▼";
        colorClass = up ? "up" : "down";

        var d = data.time ? new Date(data.time) : new Date();
        timeStr = d.toLocaleTimeString("ar-SA", {
          hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Riyadh"
        });
        if (data.stale) timeStr = "آخر سعر متاح";
      }

      var groups = "";
      for (var i = 0; i < 4; i++) {
        groups +=
          '<div class="taj-group">' +
            this.item("ذهب عيار 24", p24, arrow, colorClass) +
            this.item("ذهب عيار 21", p21, arrow, colorClass) +
            this.item("ذهب عيار 18", p18, arrow, colorClass) +
            '<div class="taj-item" style="flex-direction:row;">' +
              '<span class="taj-time">آخر تحديث: ' + timeStr + '</span>' +
            '</div>' +
          '</div>';
      }
      var inner = '<div class="taj-track">' + groups + '</div>';

      var wrap = document.querySelector(".taj-ticker-wrap");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "taj-ticker-wrap";
        document.body.prepend(wrap);
        document.body.classList.add("has-taj-ticker");
      }
      wrap.innerHTML = inner;
    },

    item: function (label, price, arrow, colorClass) {
      return (
        '<div class="taj-item">' +
          '<span class="taj-pulse"></span>' +
          '<span class="taj-label">' + label + '</span>' +
          '<strong class="' + colorClass + '">' +
            '<span class="taj-sar-icon" style="-webkit-mask-image:url(\'' + SAR_SVG + '\');mask-image:url(\'' + SAR_SVG + '\');"></span>' +
            price + ' ' + arrow +
          '</strong>' +
        '</div>'
      );
    }
  };

  /* ---------- 3. Home hero + boutique modal (home page only) ---------- */
  var CATEGORIES = [
    { href: "/rings/c1807821848",    img: MEDIA.rings, text: "خواتم" },
    { href: "/bracelets/c395012634", img: MEDIA.bracelets, text: "أساور" },
    { href: "/necklace/c1632733467", img: MEDIA.chains, text: "سلاسل" },
    { href: "/kids/c219920229",      img: MEDIA.kids,   text: "أطفال" },
    { href: "/gold-ar/c1591793254",  img: MEDIA.goldbars,   text: "سبائك" }
  ];

  var HOME_CSS = [
    ".tp-hero-wrapper{width:100%;height:100vh;height:100dvh;display:flex;align-items:center;justify-content:center;position:relative;padding-top:80px;overflow:hidden;background:var(--brand-dark);}",
    ".tp-hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;}",
    ".tp-hero-overlay{position:absolute;inset:0;z-index:2;background:linear-gradient(to bottom,rgba(11,11,11,0.4),rgba(11,11,11,0.8));}",
    ".tp-hero-content{position:relative;z-index:10;text-align:center;padding:0 25px;max-width:850px;}",
    ".tp-subtitle-box{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:25px;}",
    ".tp-accent-line{width:50px;height:1.5px;background:var(--brand-gold);border-radius:2px;}",
    ".tp-pre-title{color:var(--brand-gold);font-weight:700;font-size:1.1rem;margin:0;letter-spacing:0 !important;word-spacing:normal;}",
    ".tp-brand-title{font-size:clamp(2.5rem,8vw,5rem);color:var(--text-light);font-weight:800;line-height:1.1;margin-bottom:30px;letter-spacing:0 !important;text-shadow:0 10px 40px rgba(0,0,0,0.3);}",
    ".tp-brand-desc{color:rgba(255,255,255,0.95);font-size:1.3rem;max-width:600px;margin:0 auto 50px;line-height:1.8;font-weight:400;}",
    ".tp-btn-brand{background:rgba(255,255,255,0.1);border:1px solid var(--brand-gold);color:var(--brand-gold);padding:20px 60px;font-weight:800;font-size:1.1rem;border-radius:50px;cursor:pointer;transition:0.5s cubic-bezier(0.2,1,0.3,1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:'Almarai',sans-serif;}",
    ".tp-btn-brand:hover{background:var(--brand-gold);color:#fff;transform:translateY(-5px);box-shadow:0 20px 40px rgba(197,160,89,0.35);}",
    ".tp-modal-system{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;}",
    ".tp-modal-system.active{display:flex;}",
    ".tp-modal-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(25px);-webkit-backdrop-filter:blur(25px);}",
    ".tp-modal-window{position:relative;width:92%;max-width:550px;background:rgba(255,255,255,0.85);backdrop-filter:blur(45px);-webkit-backdrop-filter:blur(45px);box-shadow:0 40px 100px rgba(0,0,0,0.3);border-radius:40px;border:1.5px solid rgba(255,255,255,0.6);animation:tpPopIn 0.7s cubic-bezier(0.2,1,0.2,1) forwards;overflow:hidden;}",
    ".tp-close-x{position:absolute;top:25px;left:30px;background:none;border:none;z-index:25;font-size:2.2rem;color:var(--text-main);cursor:pointer;opacity:0.4;transition:0.3s;}",
    ".tp-close-x:hover{opacity:1;color:var(--brand-gold);}",
    ".tp-modal-scroll-area{padding:60px 0 40px;max-height:80vh;overflow-y:auto;}",
    ".tp-modal-header{text-align:center;margin-bottom:45px;}",
    ".tp-modal-header h3{font-size:1.8rem;margin:0 0 15px;color:var(--text-main);font-weight:800;font-family:'Almarai',sans-serif;}",
    ".tp-gold-divider{width:50px;height:3.5px;background:var(--brand-gold);margin:0 auto;border-radius:10px;}",
    ".tp-category-list{display:flex;flex-direction:column;padding:0 40px;}",
    ".tp-list-item{text-decoration:none !important;position:relative;height:130px;display:flex;align-items:center;border-bottom:1px solid var(--border-hex);transition:0.4s ease;}",
    ".tp-list-item:last-child{border-bottom:none;}",
    ".tp-list-img{width:300px;height:100%;position:absolute;right:-40px;top:0;mask-image:linear-gradient(to left,black 40%,transparent 100%);-webkit-mask-image:linear-gradient(to left,black 40%,transparent 100%);z-index:1;opacity:0.95;}",
    ".tp-list-img img{width:100%;height:100%;object-fit:cover;transition:1.2s cubic-bezier(0.2,1,0.3,1);}",
    ".tp-list-text{position:relative;z-index:5;margin-right:220px;font-size:1.7rem;font-weight:800;color:var(--text-main);transition:all 0.5s cubic-bezier(0.2,1,0.3,1);font-family:'Almarai',sans-serif;letter-spacing:0 !important;}",
    ".tp-list-item:hover .tp-list-text{color:var(--brand-gold);margin-right:200px;transform:scale(1.1);}",
    ".tp-list-item:hover .tp-list-img img{transform:scale(1.2);}",
    "@keyframes tpPopIn{from{opacity:0;transform:scale(0.9) translateY(40px);}to{opacity:1;transform:scale(1) translateY(0);}}",
    ".tp-modal-scroll-area::-webkit-scrollbar{width:0;}",
    /* Transparent header over hero video (home only), fades to solid on scroll */
    ".taj-transparent-header{position:fixed !important;top:46px;left:0;right:0;width:100%;z-index:99998;background:transparent !important;box-shadow:none !important;border-bottom:none !important;transition:background-color .45s ease,box-shadow .45s ease,backdrop-filter .45s ease;}",
    ".taj-transparent-header .inner,.taj-transparent-header .main-nav-container{background:transparent !important;}",
    /* Full-width header content over hero (theme .container constrains it otherwise) */
    ".taj-transparent-header .container{max-width:100% !important;width:100% !important;padding-left:40px !important;padding-right:40px !important;}",
    ".taj-transparent-header .h-20{height:88px !important;}",
    ".taj-transparent-header .navbar-brand img{max-height:78px !important;}",
    /* Kill the search trigger — user asked it removed */
    ".store-header button[aria-label='Search'],.store-header [onclick*='search::open'],.store-header .sicon-search,.store-header salla-search,.store-header custom-search{display:none !important;}",
    ".taj-transparent-header:not(.taj-scrolled) a,.taj-transparent-header:not(.taj-scrolled) i,.taj-transparent-header:not(.taj-scrolled) button,.taj-transparent-header:not(.taj-scrolled) span,.taj-transparent-header:not(.taj-scrolled) .navbar-brand{color:var(--brand-gold) !important;}",
    ".taj-transparent-header:not(.taj-scrolled) custom-main-menu::part(link){color:var(--brand-gold) !important;}",
    ".taj-transparent-header:not(.taj-scrolled) custom-main-menu::part(link):hover,.taj-transparent-header:not(.taj-scrolled) i:hover,.taj-transparent-header:not(.taj-scrolled) button:hover{color:#fff !important;}",
    /* Logo keeps its real gold color (no white invert) */
    /* Center nav menu in header (target live web component, not theme wrapper) */
    ".store-header custom-main-menu,.store-header .taj-main-menu{position:absolute !important;left:50% !important;transform:translateX(-50%) !important;display:flex !important;justify-content:center !important;}",
    /* Kill white circle backgrounds behind header icons */
    ".taj-transparent-header salla-user-menu,.taj-transparent-header salla-cart-summary,.store-header salla-user-menu,.store-header salla-cart-summary{background:transparent !important;}",
    /* Real light-DOM classes render the white circle button — kill their bg */
    ".store-header .s-user-menu-login-btn,.store-header .s-cart-summary-wrapper,.store-header .s-cart-summary-count{background:transparent !important;box-shadow:none !important;border:none !important;}",
    /* SVG icons have no fill attr (default black) — force gold over hero */
    ".taj-transparent-header:not(.taj-scrolled) .s-user-menu-login-btn svg,.taj-transparent-header:not(.taj-scrolled) .s-cart-summary-wrapper svg,.taj-transparent-header:not(.taj-scrolled) svg{fill:var(--brand-gold) !important;}",
    ".taj-transparent-header:not(.taj-scrolled) .s-cart-summary-count,.taj-transparent-header:not(.taj-scrolled) .s-cart-summary-total{color:var(--brand-gold) !important;}",
    ".store-header salla-user-menu::part(avatar),.store-header salla-user-menu::part(base),.store-header salla-user-menu::part(trigger),.store-header salla-user-menu::part(btn),.store-header salla-user-menu::part(button),.store-header salla-user-menu::part(icon),.store-header salla-cart-summary::part(base),.store-header salla-cart-summary::part(trigger),.store-header salla-cart-summary::part(btn),.store-header salla-cart-summary::part(button),.store-header salla-cart-summary::part(icon){background:transparent !important;box-shadow:none !important;border:none !important;}",
    ".taj-transparent-header:not(.taj-scrolled) .header-btn,.taj-transparent-header:not(.taj-scrolled) [class*='avatar'],.taj-transparent-header:not(.taj-scrolled) [class*='circle']{background:transparent !important;border-color:var(--brand-gold) !important;}",
    ".taj-transparent-header.taj-scrolled{background:rgba(249,247,242,0.95) !important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(0,0,0,0.06);border-bottom:1px solid var(--border-hex) !important;}",
    "@media (max-width:768px){.tp-hero-wrapper{padding-top:100px;}.tp-list-text{font-size:1.4rem;margin-right:180px;}.tp-list-item:hover .tp-list-text{margin-right:160px;}.tp-modal-window{width:95%;border-radius:30px;}.taj-transparent-header{top:40px;}.taj-transparent-header .h-20{height:64px !important;}.taj-transparent-header .navbar-brand img{max-height:44px !important;}.store-header .navbar-brand{position:absolute !important;left:50% !important;transform:translateX(-50%) !important;}.taj-transparent-header .container{padding-left:16px !important;padding-right:16px !important;}}"
  ].join("\n");

  function isHome() {
    var p = location.pathname.replace(/\/+$/, "");
    return p === "" || p === "/ar" || p === "/en";
  }

  function toggleBoutique(show) {
    var modal = document.getElementById("tp_boutique_modal");
    if (!modal) return;
    if (show) { modal.classList.add("active"); document.body.style.overflow = "hidden"; }
    else { modal.classList.remove("active"); document.body.style.overflow = "auto"; }
  }
  window.tp_toggle_boutique = toggleBoutique;

  function injectHome() {
    if (!isHome() || document.getElementById("tp_boutique_modal")) return;

    var homeStyle = document.createElement("style");
    homeStyle.id = "taj-home-css";
    homeStyle.textContent = HOME_CSS;
    document.head.appendChild(homeStyle);

    var storeName = (window.salla && salla.config && salla.config.get && salla.config.get("store.name")) || "المتجر";

    var hero = document.createElement("div");
    hero.className = "tp-hero-wrapper";
    // Poster as background: paints instantly and stays if the animated
    // webp fails to load. Animated webp plays in every power mode
    // (iOS Low Power Mode / battery saver) — no autoplay permission needed.
    hero.style.backgroundImage = "url('" + MEDIA.heroPoster + "')";
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
    hero.innerHTML =
      '<img class="tp-hero-video" src="' + MEDIA.heroWebp + '" alt="" ' +
        'onerror="this.style.display=\'none\'">' +
      '<div class="tp-hero-overlay"></div>' +
      '<div class="tp-hero-content">' +
        '<div class="tp-subtitle-box"><span class="tp-accent-line"></span>' +
        '<h2 class="tp-pre-title">مرحباً بكم في عالم الأناقة</h2>' +
        '<span class="tp-accent-line"></span></div>' +
        '<h1 class="tp-brand-title">فخامة الذهب<br>بتفاصيل ملكية</h1>' +
        '<p class="tp-brand-desc">تشكيلة فريدة من المجوهرات المصاغة يدوياً لتناسب ذوقكم الرفيع وبجودة تليق بتطلعاتكم.</p>' +
        '<button class="tp-btn-brand" onclick="tp_toggle_boutique(true)">استكشف المجموعات</button>' +
      '</div>';

    var items = "";
    for (var i = 0; i < CATEGORIES.length; i++) {
      var c = CATEGORIES[i];
      items +=
        '<a href="' + c.href + '" class="tp-list-item">' +
          '<div class="tp-list-img"><img src="' + c.img + '" alt="' + c.text + '" loading="lazy" onerror="this.style.display=\'none\'"></div>' +
          '<span class="tp-list-text">' + c.text + '</span>' +
        '</a>';
    }

    var modal = document.createElement("div");
    modal.id = "tp_boutique_modal";
    modal.className = "tp-modal-system";
    modal.innerHTML =
      '<div class="tp-modal-overlay" onclick="tp_toggle_boutique(false)"></div>' +
      '<div class="tp-modal-window">' +
        '<button class="tp-close-x" onclick="tp_toggle_boutique(false)">&times;</button>' +
        '<div class="tp-modal-scroll-area">' +
          '<div class="tp-modal-header"><h3>مجموعات ' + storeName + '</h3><div class="tp-gold-divider"></div></div>' +
          '<div class="tp-category-list">' + items + '</div>' +
        '</div>' +
      '</div>';

    // Prepend hero to main content area if found, else to body.
    var main = document.querySelector("main") || document.body;
    main.insertBefore(hero, main.firstChild);
    document.body.appendChild(modal);

    setupTransparentHeader(hero);
  }

  /* Make the store header transparent over the hero video, fade to solid
     once the user scrolls past the hero. Home page only. */
  function setupTransparentHeader(hero) {
    var header = document.querySelector(".store-header") ||
                 document.querySelector("header");
    if (!header) return;
    header.classList.add("taj-transparent-header");

    function onScroll() {
      // Solid once scrolled ~80% through the hero.
      var trigger = (hero.offsetHeight || window.innerHeight) * 0.8;
      if (window.pageYOffset > trigger) header.classList.add("taj-scrolled");
      else header.classList.remove("taj-scrolled");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 4. Boot ---------- */
  function boot() {
    injectStyles();
    TajGoldTicker.start();
    injectHome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
