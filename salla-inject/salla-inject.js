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

  /* ====== FOOTER CONFIG — REAL OWNER DATA ======
     Empty "" auto-hide. Ported from owner's live footer. */
  var FOOTER = {
    newsletterTitle: "كوني على إطلاع",
    newsletterText:  "اشتركي ليصلكِ جديد تصاميمنا، العروض الحصرية، وآخر أخبار عالم الذهب.",
    // Social — leave "" to hide that icon
    instagram: "https://www.instagram.com/tajalameera/",
    snapchat:  "https://snapchat.com/t/X6qwIKNa",
    tiktok:    "https://www.tiktok.com/@tajalameera?_r=1&_t=ZN-941wAC54Fdu",
    whatsapp:  "https://wa.me/message/7ZXAN6XTQQG7I1",
    // Legal (KSA)
    crNumber:  "1010134685",   // السجل التجاري
    vatNumber: "3013214697",   // الرقم الضريبي
    // Gov business-verify QR link (Ministry of Commerce)
    verifyUrl: "https://qr.mc.gov.sa/info/review?lang=ar&q=18bcm/EwQcB8MolmWsRQqQ=="
  };
  /* ================================================ */

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
    /* ============================================================
       TAJ HEADER SYSTEM — GLOBAL (runs every page via injectStyles).
       ONE base .taj-hdr + .taj-solid modifier. Sizes via CSS vars.
       Home top    = base (transparent absolute over hero).
       Home scroll = base + .taj-solid (fixed cream under ticker).
       Inner pages = base + .taj-solid (fixed cream under ticker).
       ============================================================ */
    ":root{--tk:46px;--hdr-h:72px;--icon:24px;--gap:20px;}",
    ".top-navbar{display:none !important;}",
    ".taj-hdr{position:absolute !important;top:var(--tk) !important;left:0 !important;width:100% !important;z-index:99998 !important;background:transparent !important;box-shadow:none !important;border:none !important;}",
    ".taj-hdr #mainnav,.taj-hdr .inner,.taj-hdr .main-nav-container{background:transparent !important;box-shadow:none !important;height:auto !important;min-height:0 !important;}",
    ".taj-hdr.taj-solid{position:absolute !important;top:var(--tk) !important;background:var(--soft-cream) !important;box-shadow:0 6px 24px rgba(0,0,0,0.06) !important;border-bottom:1px solid var(--border-hex) !important;}",
    ".taj-hdr .container{max-width:100% !important;width:100% !important;padding-left:32px !important;padding-right:32px !important;}",
    ".taj-hdr .container>div{height:var(--hdr-h) !important;min-height:var(--hdr-h) !important;align-items:center !important;}",
    ".taj-hdr .container>div>div{align-items:center !important;margin:0 !important;}",
    ".taj-hdr .navbar-brand img{max-height:56px !important;width:auto !important;}",
    ".taj-hdr custom-main-menu{position:absolute !important;left:50% !important;transform:translateX(-50%) !important;display:flex !important;justify-content:center !important;}",
    ".taj-hdr .flex.items-center.justify-end{display:flex !important;align-items:center !important;gap:var(--gap) !important;}",
    ".taj-hdr salla-cart-summary{margin:0 !important;}",
    ".taj-hdr salla-user-menu,.taj-hdr salla-cart-summary,.taj-hdr .s-user-menu-login-btn,.taj-hdr .s-cart-summary-wrapper,.taj-hdr #s-cart-icon,.taj-hdr .header-btn__icon,.taj-hdr .s-cart-summary-icon{display:inline-flex !important;align-items:center !important;justify-content:center !important;background:transparent !important;border:none !important;border-radius:0 !important;box-shadow:none !important;padding:0 !important;width:auto !important;height:auto !important;color:var(--brand-gold) !important;}",
    ".taj-hdr .s-user-menu-login-btn svg,.taj-hdr .s-cart-summary-wrapper svg,.taj-hdr .header-btn__icon svg,.taj-hdr .s-cart-summary-icon svg{width:var(--icon) !important;height:var(--icon) !important;fill:var(--brand-gold) !important;}",
    ".taj-hdr .sicon-shopping-bag,.taj-hdr .s-cart-summary-icon{font-size:var(--icon) !important;line-height:1 !important;color:var(--brand-gold) !important;}",
    ".taj-hdr .s-cart-summary-count{background:transparent !important;color:var(--brand-gold) !important;font-size:11px !important;}",
    ".taj-hdr .s-cart-summary-total,.taj-hdr .s-cart-summary-total .sicon-sar{color:var(--brand-gold) !important;font-size:13px !important;}",
    ".taj-hdr salla-search,.taj-hdr .sicon-search,.taj-hdr button[aria-label='Search']{display:none !important;}",
    ".taj-hdr salla-user-menu::part(base),.taj-hdr salla-user-menu::part(trigger),.taj-hdr salla-user-menu::part(button),.taj-hdr salla-cart-summary::part(base),.taj-hdr salla-cart-summary::part(trigger),.taj-hdr salla-cart-summary::part(button){background:transparent !important;box-shadow:none !important;border:none !important;}",
    ".taj-hdr i:hover,.taj-hdr button:hover,.taj-hdr .header-btn__icon:hover{color:var(--brand-dark) !important;}",
    ".taj-hdr custom-main-menu a,.taj-hdr custom-main-menu a *,.taj-hdr #mainnav .menu a,.taj-hdr .main-menu a{color:var(--brand-gold) !important;}",
    ".taj-hdr custom-main-menu a:hover,.taj-hdr custom-main-menu a:hover *,.taj-hdr #mainnav .menu a:hover{color:var(--brand-dark) !important;}",
    ".taj-hdr custom-main-menu{margin-top:4px !important;}",
    ".taj-hdr .mburger,.taj-hdr .mburger *,.taj-hdr a[aria-label*='menu' i],.taj-hdr a[aria-label*='menu' i] *,.taj-hdr .sicon-menu{color:var(--brand-gold) !important;fill:var(--brand-gold) !important;}",
    ".taj-hdr .mburger i,.taj-hdr .mburger .sicon-menu{font-size:var(--icon) !important;line-height:1 !important;}",
    "body.taj-inner-page{padding-top:calc(var(--tk) + var(--hdr-h)) !important;}",
    "/* ---- Custom page (static single page) brand styling ---- */",
    ".content--single-page{max-width:920px !important;margin:0 auto !important;padding:40px 32px 56px !important;background:#fff !important;border:1px solid var(--border-hex) !important;border-radius:16px !important;box-shadow:0 8px 32px rgba(0,0,0,0.04) !important;margin-top:32px !important;margin-bottom:48px !important;}",
    ".content--single-page>h1{font-family:'Almarai',sans-serif !important;font-size:30px !important;font-weight:800 !important;color:var(--brand-dark) !important;margin:0 0 8px !important;line-height:1.3 !important;}",
    ".content--single-page>h1::after{content:'' !important;display:block !important;width:56px !important;height:3px !important;background:var(--brand-gold) !important;border-radius:2px !important;margin-top:14px !important;margin-bottom:24px !important;}",
    ".content-entry{font-family:'Almarai',sans-serif !important;font-size:16px !important;line-height:2 !important;color:#231f1e !important;}",
    ".content-entry h2,.content-entry h3{font-family:'Almarai',sans-serif !important;font-weight:700 !important;color:var(--brand-dark) !important;margin:32px 0 12px !important;}",
    ".content-entry h2{font-size:22px !important;}",
    ".content-entry h3{font-size:18px !important;}",
    ".content-entry p{margin:0 0 18px !important;}",
    ".content-entry a{color:var(--brand-gold) !important;text-decoration:none !important;border-bottom:1px solid transparent !important;transition:border-color .2s;}",
    ".content-entry a:hover{border-bottom-color:var(--brand-gold) !important;}",
    ".content-entry strong,.content-entry b{color:var(--brand-dark) !important;font-weight:700 !important;}",
    ".content-entry ul,.content-entry ol{margin:0 0 18px !important;padding-inline-start:26px !important;}",
    ".content-entry li{margin:0 0 8px !important;}",
    ".content-entry ul li::marker{color:var(--brand-gold) !important;}",
    ".content-entry img{max-width:100% !important;height:auto !important;border-radius:12px !important;margin:20px auto !important;display:block !important;}",
    ".content-entry table{width:100% !important;border-collapse:collapse !important;margin:24px 0 !important;font-size:15px !important;overflow:hidden !important;border-radius:12px !important;border:1px solid var(--border-hex) !important;}",
    ".content-entry table th{background:var(--soft-cream) !important;color:var(--brand-dark) !important;font-weight:700 !important;padding:14px 16px !important;text-align:start !important;border-bottom:2px solid var(--brand-gold) !important;}",
    ".content-entry table td{padding:12px 16px !important;border-bottom:1px solid var(--border-hex) !important;}",
    ".content-entry table tr:last-child td{border-bottom:none !important;}",
    ".content-entry table tr:nth-child(even) td{background:#faf9f6 !important;}",
    ".content-entry blockquote{border-inline-start:3px solid var(--brand-gold) !important;background:var(--soft-cream) !important;margin:20px 0 !important;padding:14px 20px !important;border-radius:8px !important;color:#231f1e !important;}",
    "@media (max-width:768px){.content--single-page{max-width:100% !important;margin:16px 12px 32px !important;padding:24px 18px 36px !important;border-radius:12px !important;}.content--single-page>h1{font-size:24px !important;}.content-entry{font-size:15px !important;line-height:1.9 !important;}.content-entry table{font-size:13px !important;}.content-entry table th,.content-entry table td{padding:10px 10px !important;}}",
    ".mm-ocd,.mm-ocd--open,.mm-ocd__content,.mm-slideout,#mobile-menu,.mobile-menu{z-index:9999999 !important;}",
    "/* ---- TAJ custom footer (light luxury) ---- */",
    ".taj-footer{background:var(--soft-cream) !important;color:var(--text-main) !important;font-family:'Almarai',sans-serif !important;direction:rtl !important;margin-top:60px !important;padding:80px 24px 0 !important;border-top:1px solid var(--border-hex) !important;}",
    ".taj-ft-toplogo{text-align:center !important;margin-bottom:50px !important;}",
    ".taj-ft-toplogo img{max-height:90px !important;width:auto !important;margin-bottom:30px !important;display:inline-block !important;}",
    ".taj-ft-toplogo .taj-ft-div{height:1px !important;background:rgba(197,160,89,0.2) !important;width:100% !important;max-width:1200px !important;margin:0 auto !important;}",
    ".taj-ft-grid{max-width:1200px !important;margin:0 auto 70px !important;display:grid !important;grid-template-columns:1.3fr 1fr 1fr 1fr !important;gap:50px !important;}",
    ".taj-ft-col h4{color:var(--brand-gold) !important;font-size:1.1rem !important;font-weight:800 !important;margin:0 0 25px !important;letter-spacing:-0.3px !important;}",
    ".taj-ft-col ul{list-style:none !important;margin:0 !important;padding:0 !important;}",
    ".taj-ft-col li{margin:0 0 14px !important;}",
    ".taj-ft-col a{color:rgba(29,41,57,0.7) !important;text-decoration:none !important;font-size:0.95rem !important;transition:0.3s !important;font-weight:400 !important;}",
    ".taj-ft-col a:hover{color:var(--brand-gold) !important;padding-right:5px !important;}",
    ".taj-ft-news p{color:rgba(29,41,57,0.6) !important;font-size:0.9rem !important;line-height:1.7 !important;margin-bottom:25px !important;}",
    ".taj-ft-pill{display:flex !important;background:#fff !important;border-radius:50px !important;padding:5px !important;border:1px solid var(--border-hex) !important;margin-bottom:25px !important;}",
    ".taj-ft-pill input{border:none !important;flex:1 !important;padding:12px 20px !important;font-size:0.85rem !important;outline:none !important;background:transparent !important;color:var(--text-main) !important;font-family:'Almarai',sans-serif !important;}",
    ".taj-ft-pill button{background:var(--brand-gold) !important;color:#fff !important;border:none !important;padding:10px 25px !important;font-size:0.85rem !important;cursor:pointer !important;border-radius:50px !important;transition:0.3s !important;font-weight:700 !important;font-family:'Almarai',sans-serif !important;}",
    ".taj-ft-pill button:hover{background:#A6803F !important;transform:scale(1.02) !important;}",
    ".taj-ft-social{display:flex !important;gap:25px !important;}",
    ".taj-ft-social a{color:rgba(29,41,57,0.35) !important;font-size:1.55rem !important;transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275) !important;text-decoration:none !important;}",
    ".taj-ft-social a:hover{transform:translateY(-6px) scale(1.15) !important;}",
    ".taj-ft-social a.s-ig:hover{color:#E1306C !important;}",
    ".taj-ft-social a.s-sn:hover{color:#FFC800 !important;}",
    ".taj-ft-social a.s-tk:hover{color:#000 !important;}",
    ".taj-ft-social a.s-wa:hover{color:#25D366 !important;}",
    ".taj-ft-social svg{width:1.55rem !important;height:1.55rem !important;fill:currentColor !important;}",
    ".taj-ft-trust{margin-top:25px !important;}",
    ".taj-ft-trust p{color:rgba(29,41,57,0.4) !important;font-size:0.8rem !important;margin-bottom:6px !important;}",
    ".taj-ft-qr{display:inline-flex !important;flex-direction:column !important;align-items:center !important;text-decoration:none !important;margin-top:25px !important;background:#fff !important;padding:15px !important;border-radius:15px !important;border:1px solid var(--border-hex) !important;}",
    ".taj-ft-qr img{width:80px !important;height:auto !important;border-radius:8px !important;}",
    ".taj-ft-qr span{color:rgba(29,41,57,0.5) !important;font-size:10px !important;margin-top:10px !important;font-weight:400 !important;text-align:center !important;}",
    ".taj-ft-bottom{max-width:1200px !important;margin:0 auto !important;display:flex !important;justify-content:space-between !important;align-items:center !important;padding:35px 0 28px !important;border-top:1px solid var(--border-hex) !important;}",
    ".taj-ft-bottom .taj-ft-copy{color:rgba(29,41,57,0.5) !important;font-size:0.85rem !important;margin:0 !important;font-weight:400 !important;}",
    ".taj-ft-pay{display:flex !important;align-items:center !important;gap:8px !important;}",
    "@media (max-width:992px){.taj-ft-grid{grid-template-columns:1fr 1fr !important;}}",
    "@media (max-width:768px){.taj-ft-grid{grid-template-columns:1fr !important;text-align:center !important;gap:60px !important;}.taj-ft-pill{margin:0 auto 25px !important;max-width:400px !important;}.taj-ft-social{justify-content:center !important;}.taj-ft-bottom{flex-direction:column !important;gap:25px !important;}.taj-ft-qr{align-self:center !important;}}",
    "@media (max-width:768px){:root{--tk:40px;--hdr-h:60px;--icon:22px;--gap:14px;}.taj-ticker-wrap{height:40px;}.has-taj-ticker{padding-top:40px !important;}.taj-item{padding:0 15px;font-size:12px;}.taj-hdr .container{padding-left:14px !important;padding-right:14px !important;}.taj-hdr .container>div{height:var(--hdr-h) !important;min-height:var(--hdr-h) !important;display:flex !important;align-items:center !important;justify-content:space-between !important;}.taj-hdr .navbar-brand img{max-height:40px !important;}.taj-hdr .navbar-brand{position:absolute !important;left:50% !important;top:50% !important;transform:translate(-50%,-50%) !important;margin:0 !important;}.taj-hdr .mburger{position:relative !important;z-index:2 !important;display:inline-flex !important;align-items:center !important;margin:0 !important;padding:0 !important;}.taj-hdr .flex.items-center.justify-end{position:relative !important;z-index:2 !important;gap:var(--gap) !important;}.taj-hdr custom-main-menu{display:none !important;}}"
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
    /* Home-only mobile tweaks (header rules moved to global CSS so they run on EVERY page) */
    "@media (max-width:768px){.tp-hero-wrapper{padding-top:100px;}.tp-modal-window{width:95%;border-radius:30px;}.tp-modal-scroll-area{padding:52px 0 30px;max-height:82vh;}.tp-modal-header{margin-bottom:28px;}.tp-modal-header h3{font-size:1.45rem;}.tp-category-list{padding:0 22px;}.tp-list-item{height:96px;}.tp-list-img{width:190px;right:-24px;}.tp-list-text{font-size:1.3rem;margin-right:130px;}.tp-list-item:hover .tp-list-text{margin-right:120px;transform:scale(1.05);}.tp-close-x{top:18px;left:20px;font-size:1.9rem;}}",
    "@media (max-width:390px){.tp-category-list{padding:0 16px;}.tp-list-item{height:84px;}.tp-list-img{width:160px;right:-20px;}.tp-list-text{font-size:1.15rem;margin-right:104px;}.tp-list-item:hover .tp-list-text{margin-right:96px;}}"
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

  }

  /* Header — ONE base class .taj-hdr on every page. NO scroll behavior.
       Home  : transparent, fixed over hero (stays transparent, never toggles).
       Inner : .taj-solid (fixed cream bar) + body padding so content clears it. */
  function setupHeader() {
    var header = document.querySelector(".store-header") ||
                 document.querySelector("header");
    if (!header) return;

    header.classList.add("taj-hdr");

    if (!isHome()) {
      header.classList.add("taj-solid");
      document.body.classList.add("taj-inner-page");
    }
  }

  /* ---------- 4. Footer ---------- */
  function injectFooter() {
    if (document.getElementById("taj-footer")) return;

    var storeName = (window.salla && salla.config && salla.config.get &&
      salla.config.get("store.name")) || "تاج الأميرة";

    // Column 2 — shop links (reuse CATEGORIES)
    var shopLinks = "";
    for (var i = 0; i < CATEGORIES.length; i++) {
      shopLinks += '<li><a href="' + CATEGORIES[i].href + '">' + CATEGORIES[i].text + '</a></li>';
    }

    // Column 3 — policy pages (real custom-page IDs)
    var policyPages = [
      { href: "/page-473868098",  t: "من نحن" },
      { href: "/page-1004594508", t: "سياسة الخصوصية" },
      { href: "/page-365757517",  t: "الاستبدال والاسترجاع" },
      { href: "/page-1739203406", t: "الشروط والأحكام" },
      { href: "/page-1254747476", t: "الأسئلة الشائعة" },
      { href: "/page-789032778",  t: "تتبع طلبك" }
    ];
    var policyLinks = "";
    for (var j = 0; j < policyPages.length; j++) {
      policyLinks += '<li><a href="' + policyPages[j].href + '">' + policyPages[j].t + '</a></li>';
    }

    // Social icons — SVG (simple-icons paths), classes match CSS hover colors
    var SVG = {
      ig: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',
      sn: '<path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>',
      tk: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
      wa: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>'
    };
    var social = "";
    var socials = [
      { u: FOOTER.instagram, l: "Instagram", c: "s-ig", p: SVG.ig },
      { u: FOOTER.snapchat,  l: "Snapchat",  c: "s-sn", p: SVG.sn },
      { u: FOOTER.tiktok,    l: "TikTok",    c: "s-tk", p: SVG.tk },
      { u: FOOTER.whatsapp,  l: "WhatsApp",  c: "s-wa", p: SVG.wa }
    ];
    for (var s = 0; s < socials.length; s++) {
      if (socials[s].u) social += '<a class="' + socials[s].c + '" href="' + socials[s].u +
        '" target="_blank" rel="noopener" aria-label="' + socials[s].l +
        '"><svg viewBox="0 0 24 24" aria-hidden="true">' + socials[s].p + '</svg></a>';
    }
    var socialBlock = social ? '<div class="taj-ft-social">' + social + '</div>' : "";

    // Payment badges (KSA standard; owner to confirm live methods)
    var payBlock = '<div class="taj-ft-pay"><span>mada</span><span>VISA</span>' +
      '<span>Mastercard</span><span>Apple\u00A0Pay</span></div>';

    // Trust block (CR + VAT) + gov verify QR
    var trust = "";
    if (FOOTER.crNumber)  trust += '<p>السجل التجاري: ' + FOOTER.crNumber + '</p>';
    if (FOOTER.vatNumber) trust += '<p>الرقم الضريبي: ' + FOOTER.vatNumber + '</p>';
    var qr = "";
    if (FOOTER.verifyUrl) {
      var qrImg = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" +
        encodeURIComponent(FOOTER.verifyUrl);
      qr = '<a class="taj-ft-qr" href="' + FOOTER.verifyUrl + '" target="_blank" rel="noopener">' +
        '<img src="' + qrImg + '" alt="توثيق وزارة التجارة" loading="lazy">' +
        '<span>موثّق لدى وزارة التجارة</span></a>';
    }

    // Top logo — reuse store's own header logo, fallback to store name text
    var logoImg = document.querySelector(".navbar-brand img, header img");
    var logoSrc = logoImg ? logoImg.src : "";
    var topLogo = logoSrc
      ? '<img src="' + logoSrc + '" alt="' + storeName + '">'
      : '<div class="taj-ft-brand-name">' + storeName + '</div>';

    var year = new Date().getFullYear();

    var ft = document.createElement("footer");
    ft.id = "taj-footer";
    ft.className = "taj-footer";
    ft.innerHTML =
      '<div class="taj-ft-toplogo">' + topLogo + '<div class="taj-ft-div"></div></div>' +
      '<div class="taj-ft-grid">' +
        '<div class="taj-ft-col taj-ft-news">' +
          '<h4>' + FOOTER.newsletterTitle + '</h4>' +
          '<p>' + FOOTER.newsletterText + '</p>' +
          '<div class="taj-ft-pill">' +
            '<input type="email" placeholder="بريدك الإلكتروني" aria-label="بريدك الإلكتروني">' +
            '<button type="button">اشتراك</button>' +
          '</div>' +
          socialBlock +
        '</div>' +
        '<div class="taj-ft-col"><h4>تسوّق</h4><ul>' + shopLinks + '</ul></div>' +
        '<div class="taj-ft-col"><h4>روابط مهمة</h4><ul>' + policyLinks + '</ul></div>' +
        '<div class="taj-ft-col">' +
          '<h4>موثوقية</h4>' +
          '<div class="taj-ft-trust">' + trust + '</div>' + qr +
        '</div>' +
      '</div>' +
      '<div class="taj-ft-bottom">' +
        '<p class="taj-ft-copy">\u00A9 ' + year + ' ' + storeName + '. جميع الحقوق محفوظة.</p>' +
        payBlock +
      '</div>';

    // Replace Salla's native footer if present, else append to body.
    var nativeFt = document.querySelector("footer.s-footer, .store-footer, footer:not(#taj-footer)");
    if (nativeFt && nativeFt.parentNode) {
      nativeFt.style.display = "none";
      nativeFt.parentNode.insertBefore(ft, nativeFt.nextSibling);
    } else {
      document.body.appendChild(ft);
    }
  }

  /* ---------- 5. Boot ---------- */
  function boot() {
    injectStyles();
    TajGoldTicker.start();
    injectHome();
    setupHeader();
    injectFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
