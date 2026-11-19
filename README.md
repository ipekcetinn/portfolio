# İpek Çetin — Portfolio

A single-page portfolio built with React, TypeScript, and Vite.
The design features vintage collages, responsive layouts, an SVG spiral, transparent cat artwork, and scroll animations.

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. Vite automatically updates the page when you save changes.
Use the development server instead of opening `index.html` directly.

## Checks and production build

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

The production build is generated in `dist/`. Deploy this directory to a static hosting service.
`npm run preview` serves the production build on port 3000; stop the development server before running it.

## Live website

Visit [ipekcetinn.github.io/portfolio](https://ipekcetinn.github.io/portfolio/).

The site is hosted on GitHub Pages. Changes pushed to `main` are automatically built and deployed
through GitHub Actions. Check the repository's Actions tab for deployment status.
The `localhost:3000` address is accessible only on the computer running the development server.

## Project structure

- `src/main.tsx`: React entry point and CSS imports.
- `src/App.tsx`: Page composition and animation lifecycle.
- `src/components/`: Hero, About, Experience, Education, Training, Skills, Projects, Contact, and other components.
- `src/lib/scrollAnimations.ts`: Typed scroll controller; effect cleanup removes listeners, observers, and pending animation frames.
- `src/styles.css`: Visual design and responsive styles.
- `public/assets/`: Local artwork. Add new images here; browser paths use `assets/...`.
- `vite.config.ts`: Local server, development file access, and production base path settings.
- `scripts/`: Tests for rendered React HTML and scroll behavior.

## Content and artwork

Page content is in English. The education section lists Atılım University (2023–2027, expected).
The projects section contains no fictional work. No phone number is published. The local `cv.pdf` is ignored by Git,
blocked by the Vite development server, and excluded from the production build.

Collages are decorative illustrations, not photographs of actual institutions.
Details are available in `public/assets/collage/generation-notes.json` and `public/assets/NEEDED-ASSETS.md`.

Scroll animations follow the user's scrolling. Reduced-motion preferences disable animation and pinning.
Node tests check behavior and rendered React output; appearance on real devices should be verified separately.

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
