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

### 2. Category links — VERIFY  (priority: HIGH)
- Lines 141-145 hrefs are guesses: `/category/rings`, `/bracelets`, `/chains`, `/kids`, `/gold-bars`
- Salla usually uses numeric category IDs (e.g. `/ar/category/12345/name`).
- Check real category URLs in Salla dashboard, update each `href`.

### 3. jsDelivr cache — settle check  (priority: LOW)
- Some shrunk category images may still serve OLD size for a few min after purge.
- Re-purge if needed: `https://purge.jsdelivr.net/gh/moalmohtasib/taj-alameera-vip@master/salla-inject/media/FILE.webp`
- After code change to repo, jsDelivr `@master` caches ~12h. To force fresh: purge, OR pin URL to commit hash.

### 4. Mobile test  (priority: MEDIUM)
- Verify hero video autoplays on iOS/Android (needs `muted` + `playsinline` — both present, but test real device).
- Verify ticker + modal layout on small screens.

### 5. Content polish  (priority: LOW)
- Hero text hardcoded Arabic. Confirm final copy.
- Category Arabic labels: خواتم/أساور/سلاسل/أطفال/سبائك — confirm match store categories.

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
