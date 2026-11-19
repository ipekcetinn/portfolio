# Cat and yarn scene assets

All three PNGs are project-local, real-alpha raster illustrations. Native canvas size:
1254 x 1254 for each layer. They are loaded lazily by CatYarnScene.

- cat-body.png: stationary body, edited from ../engraved-cat.png.
- cat-paw.png: isolated near foreleg, edited from the same source, with registered square canvas.
- yarn-ball.png: generated to match the same engraving; approved by the user during this task.

Method: OpenAI built-in image_gen. These are generated/edited project artwork,
not historical scans and not a public-domain Tenniel reproduction.
The input seated cat was itself generated for this project; see ../README.md.
The yawning hero cat was not edited.

Registration: the paw rotates around 44% 55% of its full square layer.
A soft alpha mask blends its shoulder into the fixed torso.
The yarn ball and its separate zero-size rope anchor both use 50% 12.5%.
That is inside the visible loose-end pixels; rotating around that point keeps the
rope attachment stationary. No simulated particles are re-created per animation frame.

Animation: native Web Animations API, 3.3-second gesture; first idle 4.2 seconds,
later idle intervals 6.8, 10.4, 8.3 and 12.2 seconds. Mouse hover, click, touch and
native keyboard button activation trigger the same gesture. Offscreen/hidden
and reduced-motion states cancel animations and timers.

Research (not used in the website):
- John Tenniel, Kitten ball, 1871:
  https://commons.wikimedia.org/wiki/File:Kitten_ball.jpg
  Commons metadata lists Public domain; the original-file server returned HTTP 429.
- https://picryl.com/media/kitten-ball-a928fa also identifies that engraving as public domain.
- Other researched historic pictures did not match the requested style/pose closely enough.
No externally downloaded illustration is bundled in this scene.

Prompts are recorded in generation-notes.json.
