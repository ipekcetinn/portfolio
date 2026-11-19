# Güncel hero görselleri

- spiral-background.png: kullanıcı tarafından sağlanan arka plan. CSS background-size: cover ile dönen katmanda kullanılır.
- cat-cutout.png: kullanıcının sağladığı aynı kedinin arka planı Imagegen ile temizlenmiş, gerçek alpha içeren sürümü. Orijinali cat-cutout-original.png dosyasında korunur. Başlık ve spiralden bağımsız img katmanında kullanılır.
- Spiral orijinali korunmuştur; kedide yalnızca arka plan çıkarımı için görsel düzenleme yapılmıştır. Ayrıntılı kontrol ve prompt kaydı qa/README.md içindedir.
- Aşağıdaki eski assetler korunmuştur, ancak güncel hero tarafından kullanılmaz.

---
# Hero assetleri

## engraved-cat.png

OpenAI yerleşik Imagegen aracıyla bu proje için üretilmiştir. Şeffaf arka plan korunmuştur. Haricî bir sanatçı veya hazır görsel kaynağından alınmamıştır.

Kullanılan nihai prompt:

> Use case: illustration-story. Asset type: transparent cutout for the center of a dark retro experimental portfolio hero. A single seated domestic cat, full body and curling tail, front-facing, dignified and slightly mysterious, antique copperplate engraving / 19th century woodcut print. Finely detailed crosshatching, distressed ink, elegantly drawn feline anatomy and eyes. Restrained two-ink illustration in aged ivory cream (#e7d8b8) and very dark burgundy (#321018); ivory fur illuminated against dark ink hatching, legible over a burgundy/cream spiral. Centered composition with generous transparent margins, portrait-like silhouette inside square canvas. Genuinely transparent background, no scenery, no frame, no lettering, no watermark, no emojis, no photorealism, no cartoon. This is the cat asset only, do not draw the spiral or website text.

## hero-spiral.svg

Beş kollu, yarıçapa bağlı açı değişimiyle koddan oluşturulmuş vektör spiral. Bordo #4b1523 ve eskitilmiş krem #dbc8a8. Dönüş tüm SVG katmanına uygulanır; kedi ve yazılar bu katmanın dışındadır.

## print-grain.svg

SVG fractalNoise filtresiyle oluşturulan durağan baskı dokusu. Herhangi bir süreli animasyon içermez.
