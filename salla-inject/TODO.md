# TAJ ALAMEERA — Salla Injection: Progress & TODO

File: `salla-inject/salla-inject.js` (paste into Salla → Store Design → Advanced → Customize with JavaScript)
Media hosted: GitHub repo `moalmohtasib/taj-alameera-vip` → jsDelivr CDN (public repo)
CDN base: `https://cdn.jsdelivr.net/gh/moalmohtasib/taj-alameera-vip@master/salla-inject/media/`

---

## DONE

- [x] Recovered file after VSCode crash (nothing lost)
- [x] Gold-price ticker (live, Cloudflare proxy, 60s refresh)
- [x] Home hero section + boutique category modal
- [x] Fixed dead WordPress image URLs (site offline) — moved all media to GitHub + jsDelivr
- [x] Category popup images: 5 webp, shrunk 1024→600px, ~200KB → ~59KB total
- [x] Hero background: converted 4.8MB animated webp → **763KB mp4** in `<video>` (autoplay/loop/muted/playsinline)
- [x] Hero poster (34KB jpg) paints instantly before video loads
- [x] Repo made public, all media pushed, jsDelivr cache purged

---

## TODO (next session)

### 1. SAR riyal icon — DEAD LINK  ✅ DONE
- Was: `SAR_SVG` pointed to offline WordPress path.
- Fixed: `Saudi_Riyal_Symbol.svg` (923B) added to media, pushed, jsDelivr purged.
- Now: `SAR_SVG = CDN + "Saudi_Riyal_Symbol.svg"`. Verified live HTTP 200.
- Note: uses `mask-image` so SVG fill color irrelevant, tints to `currentColor`.

### 2. Category links — VERIFY  ✅ DONE
- Real Salla IDs applied (lines 141-145), pattern `/{slug}/c{id}`, locale prefix dropped:
  - خواتم → /rings/c1807821848
  - أساور → /bracelets/c395012634
  - سلاسل → /necklace/c1632733467
  - أطفال → /kids/c219920229
  - سبائك → /gold-ar/c1591793254
- Verified: rings/gold-ar/necklace all HTTP 200 live.

### 3. jsDelivr cache — settle check  ✅ DONE
- All 5 category webp serve HTTP 200 fresh shrunk sizes from CDN:
  Rings 35K, Bracelets 46K, Chains 30K, Kids 14K, Gold-Bars 44K.
- No stale sizes. Cache settled.
- Reminder: after repo change, `@master` caches ~12h. Force fresh: purge, OR pin URL to commit hash.

### 4. Mobile test  (priority: MEDIUM)
- iOS battery saver blocks `<video>` autoplay (Apple hard rule, no JS override).
  Showed static poster on iPhone — user reported "shows as photo".
- FIXED: dropped `<video>`, now animated webp in `<img>`. Animated webp plays
  in EVERY power mode (battery saver incl.), no autoplay permission needed.
  Using ORIGINAL WordPress webp (800x450, 234 frames, 4.6MB) — my re-encode
  glitched, so restored untouched source from taj-alameera-ex/public/images.
  Poster still set as hero background = instant paint + fallback if load fails.
- REQUIRES RE-PASTE of salla-inject.js into Salla panel.
- Still to verify on device: animation smoothness + ticker/modal layout small screens.

### 6. Header  ✅ FIXED + VERIFIED (Playwright, mobile iPhone 13)
- Live store runs Salla DEFAULT header, NOT the twig. `.taj-hdr` class on
  `HEADER.store-header`; `#mainnav` is INSIDE it (theme sets `#mainnav` inline
  `height:84px;bg:white` on inner pages — neutralized by `.taj-hdr #mainnav{...}`).

- ROOT CAUSE of all "inner page white / gray icons / static position" pain:
  the whole header CSS block was living in the HOME_CSS array, which
  `injectHome()` only injects on home (returns early elsewhere). Inner pages got
  the `.taj-hdr .taj-solid` CLASSES but ZERO css backing them → theme defaults
  (position:static, cart gray rgb(55,65,81), height 136px, gap normal).
  FIX: moved entire header block into the GLOBAL `CSS` array (lines ~54-78),
  which `injectStyles()` runs on EVERY page. Now 44 rules parse on both pages.

- SYSTEM (coherent, replaced 47 tangled overrides): ONE base `.taj-hdr` +
  `.taj-solid` modifier. Sizes via CSS vars `--tk --hdr-h --icon --gap`
  (desktop 46/72/24/20, mobile 40/60/22/16 @≤768px).
  - Home top: base = transparent absolute over hero.
  - Home scroll: base + `.taj-solid` (fixed cream under ticker, scroll listener).
  - Inner pages: base + `.taj-solid` (fixed cream under ticker) + body
    `.taj-inner-page` padding-top = tk+hdr-h so content clears fixed header.
  - `setupHeader()` (JS ~306-330): adds `.taj-hdr`; home wires scroll toggle,
    inner pages add `.taj-solid` + body class directly.
- Icons: cart is icon-FONT `.sicon-shopping-bag` (size via font-size:var(--icon),
  color gold), user is 32px svg (width/height:var(--icon), fill gold). Both gold
  in ALL states, hover → brand-dark. White circle killed on
  `.s-user-menu-login-btn / .s-cart-summary-wrapper / #s-cart-icon /
  .header-btn__icon` (bg transparent, no border/radius/shadow).
- `.top-navbar` (Salla native search+contacts bar = the "gap" source) hidden.
  Search hidden. Menu centered via `custom-main-menu{position:absolute;left:50%}`.
- Mobile burger: menu z-index 9999999 > header 99998 so it covers header (no
  more "menu under header"). No display:none hide (that made header vanish).

- VERIFIED via /tmp/taj-shots/run.js (system Chrome, iPhone 13, real computed
  styles, OLD deployed inject stripped first so fresh code runs):
    Home     → taj-hdr, position absolute, top 40, height 60, cart GOLD, gap 16.
    Category → taj-hdr taj-solid, position FIXED, top 40, height 61, cart GOLD,
               gap 16. IDENTICAL to home. (before fix: static/gray/136/normal.)
- Commits: 9e579ed, 03251b6, 12b5554, 3df6f5b, 3a89081, a6e60f0, b0bec0c, +rebuild.
- ⚠️ REQUIRES RE-PASTE of salla-inject.js into Salla panel (old build still live
  there — that's why the harness had to strip it first to test).

### 7. Header polish + scroll removal  ✅ DONE + VERIFIED (desktop 1440 + mobile iPhone13)
- Menu items were BLACK → now GOLD. Root: targeted shadow `::part(link)` (dead,
  menu is LIGHT dom). Fixed via real selectors `.taj-hdr custom-main-menu a` +
  `#mainnav .menu a` + `.main-menu a` → gold, hover brand-dark. Nudged +4px down
  (`custom-main-menu{margin-top:4px}`).
- Burger was ORANGE rgb(255,191,105) → now GOLD. Rules `.taj-hdr .mburger,
  .mburger *, a[aria-label*='menu'], .sicon-menu {color/fill:gold}`; icon sized
  `font-size:var(--icon)`.
- Mobile header rebalanced: `.container>div{justify-content:space-between}`,
  logo centered absolute, burger left z2, icons right z2, gap var(--gap).
- SCROLL HEADER REMOVED entirely (user: "we do not need on scrol header").
  - `setupHeader()` (~318-327): NO scroll listener, NO toggle. Home = base only
    (transparent). Inner = `.taj-solid` + body `.taj-inner-page` directly.
  - `.taj-hdr` AND `.taj-hdr.taj-solid` both `position:absolute` (was fixed) →
    header SCROLLS AWAY with page, not pinned.
  - Home stays TRANSPARENT top+scroll (user corrected: home must be transparent).
- LIVE SITE re-check (live.js, no strip): live store ALREADY runs latest header
  code (injectLen 7029, position absolute, scrolls away). User's "scroll header
  still there" sightings = BROWSER CACHE. Advised hard-refresh/incognito.

### 8. Full 15-page × 2-device audit  ✅ DONE (full.js)
- All 11 custom pages + product/cart/categories: inject running, ticker top:0,
  home header transparent, all inner cream taj-solid absolute, body padding
  mobile 100px / desktop 118px clears content. Custom pages AUTO-WIRED by
  site-wide inject (ticker+header+font apply, no per-page code needed).
- Discovered all 11 custom page IDs (discover.js). See list bottom.

### 9. Custom-page CONTENT styling  ✅ DONE + VERIFIED (desktop+mobile)
- FINDING: all 11 custom pages are EMPTY SHELLS — each `.content-entry` holds
  only `<p>title</p>`. Merchant published pages, never wrote body content yet.
- Wrapper = `.content--single-page` (Salla static-page container), body =
  `.content-entry`. Added brand CSS block (CSS array ~80-102) so future content
  auto-brands:
  - Card: max 920px centered, white, radius 16px, soft shadow, cream page bg.
  - H1: 30px w800 dark + gold underline accent. Body Almarai 16px lh2.
  - Gold links, gold list markers, full table styling (cream head/gold underline/
    striped/rounded), blockquote gold accent, responsive imgs.
  - Mobile @≤768: full-width card, 24px H1, tighter padding, 13px table.
- Verified strip-and-inject on About page: 69 rules parse, all applied both devices.

### 10. Boutique modal small-screen  ✅ DONE + VERIFIED (390px + 360px)
- Was: item 130px tall (650px total forces scroll), img 300px, list pad 40px.
- Refined HOME_CSS mobile queries (lines ~238-239):
  - @≤768: item 96px, img 190px, list pad 22px, header/close tightened, 82vh.
  - @≤390: item 84px, img 160px, list pad 16px, text 1.15rem.
- Verified: no overflow (img right 383<390 / 354<360), 5 items fit no scroll.

### 11. Ticker numbers  ✅ VERIFIED (no change)
- Live proxy `taj-gold-proxy...workers.dev` → dewanaldahab.com: 24k 492.44 /
  21k 430.08 / 18k 368.42, stale:false. Browser renders EXACT values + gold
  arrows + Riyadh Arabic time. 60s refresh confirmed. Source loads via JS
  (TradingView) so can't diff statically, but proxy stale:false = fresh.

### TOMORROW — pick up here
- RE-PASTE salla-inject.js into Salla panel (deploy step for all above).
- Remaining: hero Arabic copy final sign-off; full checkout/cart/wishlist test
  pass; merchant to fill custom-page BODY content (then style specifics:
  size-guide table, FAQ accordions, contact form).

### 5. Content polish  (priority: LOW)
- Hero text hardcoded Arabic. Confirm final copy.
- Category Arabic labels: خواتم/أساور/سلاسل/أطفال/سبائك — confirm match store categories.

### CUSTOM PAGE IDS (all published, empty shells)
- من نحن (About): /page-473868098
- لماذا تاج الأميرة (Why us): /page-1847313987
- سياسة الخصوصية (Privacy): /page-1004594508
- سياسة الاستبدال والاسترجاع (Returns): /page-365757517
- اتفاقية الاستخدام والسياسات (Terms): /page-1739203406
- دليل مقاسات الخواتم (Size guide): /page-829899343
- العناية بالمجوهرات (Care): /page-1564115017
- تتبع طلبك (Track): /page-789032778
- الأسئلة الشائعة (FAQ): /page-1254747476
- حكم شراء الذهب أون لاين (Fatwa): /page-613813333
- تواصل معنا (Contact): /page-1987259222

### VERIFY HARNESSES (/tmp/taj-shots/)
- run.js — header verify desktop+mobile (strips old inject, probes menu/burger/scroll/sticky)
- live.js — live-site AS-IS inspector (no strip)
- discover.js — internal link discovery
- full.js — 15-page × 2-device audit
- content.js / tree.js / entry.js — custom-page content structure probes
- verify-page.js — custom-page brand-style verify
- modal.js — boutique modal small-screen test

---

## HOW TO UPDATE MEDIA (workflow reminder)

1. Put/replace file in `salla-inject/media/`
2. `git add salla-inject/media && git commit -m "..." && git push origin master`
   (big files: `git -c http.postBuffer=524288000 push origin master`)
3. Purge jsDelivr: `curl https://purge.jsdelivr.net/gh/moalmohtasib/taj-alameera-vip@master/salla-inject/media/FILE`
4. No code change needed if filename same — `@master` URL auto-serves new file.

## TOOLS ON HAND
- Static ffmpeg at `/tmp/ffmpeg` (may be gone after reboot — re-download from evermeet.cx, or `brew install ffmpeg`)
- webp tools: `cwebp` / `dwebp` / `webpmux` (installed)
- Frame extract → mp4 recipe: webpmux -get frame N ... then ffmpeg -framerate 24 -i frames ...

## CURRENT MEDIA IN REPO
- hero.mp4 (763KB)
- hero-poster.jpg (34KB)
- Rings / Bracelets / Chains / Kids / Gold-Bars .webp (600px, ~10-15KB each)
