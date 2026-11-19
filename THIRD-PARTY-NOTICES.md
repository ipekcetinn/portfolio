# Third-party components

## React Bits ? Faulty Terminal

- Author: David Haz / React Bits
- Source: https://reactbits.dev/backgrounds/faulty-terminal
- Repository: https://github.com/DavidHDev/react-bits
- Registry: https://reactbits.dev/r/FaultyTerminal-TS-CSS.json
- Local file: src/components/effects/FaultyTerminal.tsx
- License: see REACT-BITS-LICENSE.md (upstream MIT + Commons Clause).
- Adaptations: scoped About Me styling, reduced-motion behavior, render lifecycle,
  disabled decorative pointer listeners, and immediate pause when offscreen/hidden.

## React Bits ? Tear Ticket

- Author: David Haz / React Bits
- Source: https://reactbits.dev/r/TearTicket-TS-CSS.json
- Local files: src/components/effects/TearTicket.tsx and TearTicket.css
- License: see REACT-BITS-LICENSE.md.
- Adaptations: typed image dimensions, lazy loading, lifecycle configuration updates,
  and portfolio-specific biography content via AboutTicket.tsx.
- Dependency: Motion (motion/react).

## React Bits ? Side Rays

- Author: David Haz / React Bits
- Source: https://reactbits.dev/r/SideRays-TS-CSS.json
- Local files: src/components/effects/SideRays.tsx and SideRays.css
- License: see REACT-BITS-LICENSE.md.
- Adaptations: lifecycle-safe settings updates, immediate offscreen/hidden pause,
  static reduced-motion rendering and Education-only top-right integration.

## Physics Rope

- Source: https://github.com/code4fukui/physics-rope (branch es6)
- Revision: 0cf6431ebefafa771b56d1bc98ccf1222795cf25
- Original author: James Wrightson, copyright 2018.
- License: MIT; full notice retained in PHYSICS-ROPE-LICENSE.
- Adapted RopePoint.integrate and neighbour distance constraints from Rope.js into
  src/lib/yarnPhysics.ts. No code is loaded from a CDN at runtime.
- Adaptations: strict TypeScript types, zero-distance guard, positive fixed timestep,
  bounded solver iterations, text collisions, local viewport simulation, soft rest
  guides, capped drag impulse, sleep detection, touch hit areas and React cleanup.
- The original demo App.js is not used: it computes a negative delta time and has
  no React lifecycle cleanup. The portfolio controller uses a capped positive accumulator.
- The production distribution retains the full MIT notice in public/licenses/physics-rope.txt (copied to dist/licenses/physics-rope.txt).

## React Bits - TextType

- Author: David Haz / React Bits.
- Source: user-supplied integration prompt; matching TypeScript source from
  https://reactbits.dev/r/TextType-TS-CSS.json.
- Local files: src/components/effects/TextType.tsx and TextType.css.
- License: REACT-BITS-LICENSE.md (retained).
- Adaptations: React-compatible JSX refs, reserved final text layout, section visibility
  and hidden-tab pause, immediate reduced-motion rendering, character/tween cleanup,
  one-shot Experience heading and CV content with no simulated typos.
- GSAP dependency retains its own license in public/licenses/gsap.txt.

## React Bits - Folder

- Author: David Haz / React Bits.
- Source: user-supplied Folder integration prompt and its matching full TypeScript
  variant from https://reactbits.dev/r/Folder-TS-CSS.json.
- Local files: src/components/effects/Folder.tsx and Folder.css.
- License: REACT-BITS-LICENSE.md (retained).
- Full source/API retained: flap/book, materials including optional glass/WebGL,
  paper spreading, pointer dragging/drop, zoom, peek and viewport intro.
- Training uses the matte sepia/cream variant, responsive size and three unchanged
  course records. A selected course is also readable below the folder.
- Integration fixes: layout-effect ref synchronization, hidden/offscreen pause,
  live reduced-motion updates, cleanup guard for deferred font work, resting
  target/floor constraint consistency so the closed-folder solver sleeps.
- Pointer events within the Training details do not close the archive.
- No new runtime dependency or certificate image was added.

## React Bits - Particles

- Author: David Haz / React Bits.
- Source: https://reactbits.dev/r/Particles-TS-CSS.json
- Local files: src/components/effects/Particles.tsx and Particles.css.
- License: see REACT-BITS-LICENSE.md (MIT + Commons Clause).
- Adaptations: effect-safe settings updates, static reduced-motion rendering,
  immediate offscreen/hidden pause and Technical Skills integration.
- Native WebGL2; no additional dependency. Unsupported contexts leave the content intact.
