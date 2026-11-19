# ?pek ?etin ? Portfolio

React, TypeScript ve Vite ile geli?tirilmi? tek sayfal?k portfolyo.
Mevcut vintage kolaj tasar?m?, mobil stiller, SVG spiral, ?effaf kedi ve scroll animasyonlar? korunur.

## Geli?tirme

```sh
npm install
npm run dev
```

http://localhost:3000 ? Kaydedilen de?i?iklikler Vite taraf?ndan otomatik yans?t?l?r.
Do?rudan index.html dosyas?na ?ift t?klamak yerine geli?tirme sunucusunu kullan.

## Kontroller ve ?retim

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

?retim ??kt?s? `dist/` klas?r?d?r. Statik hosting i?in bu klas?r? yay?nla.
`npm run preview`, geli?tirme sunucusu kapal?yken ayn? 3000 portunda ?retim ??kt?s?n? a?ar.

## Dosyalar

- `src/main.tsx`: React ba?lang?? noktas? ve CSS importu.
- `src/App.tsx`: Sayfa kompozisyonu ve animasyon ya?am d?ng?s?.
- `src/components/`: Hero, About, Experience, Education, Training, Skills, Projects, Contact ve di?er bile?enler.
- `src/lib/scrollAnimations.ts`: Tipli scroll kontrol?; effect temizlenince dinleyiciler, observer ve rAF i?leri kald?r?l?r.
- `src/styles.css`: Mevcut tasar?m ve responsive stiller.
- `public/assets/`: Yerel g?rseller; yeni g?rselleri buraya ekle. Taray?c? yollar? `assets/...` olarak korunur.
- `vite.config.ts`: Yerel sunucu ve geli?tirme dosya eri?im ayarlar?.
- `scripts/`: React HTML ??kt?s? ve scroll davran??? testleri.

## ??erik ve g?rseller

Sayfa i?erikleri ?ngilizcedir. E?itim yaln?zca At?l?m University (2023?2027, expected) kayd?n? i?erir.
Projeler alan?nda hayali ?al??ma bulunmaz. Telefon numaras? yay?nlanmaz; yerel `cv.pdf` Git taraf?ndan yok say?l?r,
Vite geli?tirme sunucusunda eri?ime kapal?d?r ve ?retim ??kt?s?na al?nmaz.

Kolajlar dekoratif ill?strasyonlard?r; ger?ek kurum foto?raf? olarak sunulmaz.
Ayr?nt?lar `public/assets/collage/generation-notes.json` ve `public/assets/NEEDED-ASSETS.md` i?indedir.

Scroll hareketi kullan?c? kayd?rmas?na ba?l?d?r. Azalt?lm?? hareket tercihinde hareket ve sabitleme devre d??? kal?r.
Node testleri davran?? mant???n? ve React ??kt?s?n? kontrol eder; ger?ek cihaz g?r?n?m? ayr?ca do?rulanmal?d?r.

## Interactive yarn rope

The decorative thread is rendered by src/components/YarnRope.tsx.
src/lib/yarnPhysics.ts adapts the MIT-licensed Physics Rope Verlet solver;
src/lib/yarnRopeScene.ts handles rendering, pointer input and lifecycle cleanup.

Drag an exposed portion of the rope with a mouse or finger. Only the narrow rope
hit area captures a gesture; the rest of the page retains normal scrolling and links.
The endpoints stay anchored, and release motion is damped until the solver sleeps.
Reduced-motion mode renders a static contour and allows direct manipulation without
an ongoing settling animation.

The canvas is viewport-sized (pixel ratio capped at 1.5), not document-sized.
Only nearby rope nodes are simulated. Resize, content and image/font loading
refresh the route. There is no additional runtime dependency or remote script.
See PHYSICS-ROPE-LICENSE and THIRD-PARTY-NOTICES.md for attribution.
The footer CatYarnScene uses native Web Animations for separate paw and yarn-ball
layers. It pauses offscreen/hidden and respects reduced motion. Its fixed loose-end
anchor supplies the endAnchor used to generate the existing rope particles.
Artwork provenance and exact Imagegen prompts: public/assets/cat-yarn/README.md
and public/assets/cat-yarn/generation-notes.json.
Training now uses the full React Bits Folder TypeScript source in matte mode. Open the archive and
select one of the three paper notes to read its original course/camp/university.
Touch dragging, page zoom, hover peek, intro, Enter/Space, Escape and reduced motion are supported.
No new runtime dependency or certificate image was added.