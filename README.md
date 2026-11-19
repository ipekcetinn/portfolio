# İpek Çetin — Portfolio

React, TypeScript ve Vite ile geliştirilmiş tek sayfalık portfolyo.
Mevcut vintage kolaj tasarımı, mobil stiller, SVG spiral, şeffaf kedi ve scroll animasyonları korunur.

## Geliştirme

```sh
npm install
npm run dev
```

http://localhost:3000 — Kaydedilen değişiklikler Vite tarafından otomatik yansıtılır.
Doğrudan index.html dosyasına çift tıklamak yerine geliştirme sunucusunu kullan.

## Kontroller ve üretim

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

Üretim çıktısı `dist/` klasörüdür. Statik hosting için bu klasörü yayınla.
`npm run preview`, geliştirme sunucusu kapalıyken aynı 3000 portunda üretim çıktısını açar.

## Web sitesine erişim

Canlı site: [ipekcetinn.github.io/portfolio](https://ipekcetinn.github.io/portfolio/)

Site GitHub Pages üzerinde yayınlanır. `main` dalına gönderilen değişiklikler GitHub Actions ile
otomatik olarak derlenir ve yayınlanır. Yayın durumunu deponun Actions sekmesinden takip edebilirsin.
`localhost:3000` adresi yalnızca geliştirme sunucusunun çalıştığı bilgisayardan açılır.

## Dosyalar

- `src/main.tsx`: React başlangıç noktası ve CSS importu.
- `src/App.tsx`: Sayfa kompozisyonu ve animasyon yaşam döngüsü.
- `src/components/`: Hero, About, Experience, Education, Training, Skills, Projects, Contact ve diğer bileşenler.
- `src/lib/scrollAnimations.ts`: Tipli scroll kontrolü; effect temizlenince dinleyiciler, observer ve rAF işleri kaldırılır.
- `src/styles.css`: Mevcut tasarım ve responsive stiller.
- `public/assets/`: Yerel görseller; yeni görselleri buraya ekle. Tarayıcı yolları `assets/...` olarak korunur.
- `vite.config.ts`: Yerel sunucu ve geliştirme dosya erişim ayarları.
- `scripts/`: React HTML çıktısı ve scroll davranışı testleri.

## İçerik ve görseller

Sayfa içerikleri İngilizcedir. Eğitim yalnızca Atılım University (2023–2027, expected) kaydını içerir.
Projeler alanında hayali çalışma bulunmaz. Telefon numarası yayınlanmaz; yerel `cv.pdf` Git tarafından yok sayılır,
Vite geliştirme sunucusunda erişime kapalıdır ve üretim çıktısına alınmaz.

Kolajlar dekoratif illüstrasyonlardır; gerçek kurum fotoğrafı olarak sunulmaz.
Ayrıntılar `public/assets/collage/generation-notes.json` ve `public/assets/NEEDED-ASSETS.md` içindedir.

Scroll hareketi kullanıcı kaydırmasına bağlıdır. Azaltılmış hareket tercihinde hareket ve sabitleme devre dışı kalır.
Node testleri davranış mantığını ve React çıktısını kontrol eder; gerçek cihaz görünümü ayrıca doğrulanmalıdır.

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
