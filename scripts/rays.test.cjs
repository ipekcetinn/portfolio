const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function mount({ reduced = false, webgl = true } = {}) {
  const effects = [];
  const refs = [];
  const frames = new Map();
  const documentEvents = new Map();
  const windowEvents = new Map();
  const calls = [];
  let intersection;
  let nextFrame = 1;
  const gl = new Proxy({
    COMPILE_STATUS: 1, LINK_STATUS: 2, ACTIVE_UNIFORMS: 3,
    isContextLost: () => false,
    getShaderParameter: () => true,
    getProgramParameter: (program, parameter) => parameter === 3 ? 0 : true,
  }, {
    get(target, key) {
      if (key in target) return target[key];
      if (/^[A-Z_0-9]+$/.test(key)) return 4;
      return (...args) => { calls.push([key, ...args]); return {}; };
    },
  });
  const container = { getBoundingClientRect: () => ({ width: 650, height: 600, left: 0, top: 0, right: 650, bottom: 600 }) };
  const canvas = { getContext: () => webgl ? gl : null, addEventListener() {}, removeEventListener() {} };
  const hookReact = {
    useState: (value) => [value, () => {}],
    useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
    useEffect(effect) { effects.push(effect); },
  };
  const mod = { exports: {} };
  const document = {
    hidden: false,
    visibilityState: 'visible',
    documentElement: { addEventListener() {}, removeEventListener() {} },
    addEventListener: (name, callback) => documentEvents.set(name, callback),
    removeEventListener: (name) => documentEvents.delete(name),
  };
  const requestFrame = (callback) => { const id = nextFrame++; frames.set(id, callback); return id; };
  class ResizeObserver { observe() {} disconnect() { calls.push(['resizeDisconnect']); } }
  class IntersectionObserver {
    constructor(callback) { intersection = callback; }
    observe() {}
    disconnect() { calls.push(['intersectionDisconnect']); }
  }
  const source = fs.readFileSync(path.join(__dirname, '../src/components/effects/SideRays.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: mod.exports, module: mod,
    require: (name) => name === 'react' ? hookReact : name.endsWith('.css') ? {} : require(name),
    performance: { now: () => 0 },
    document,
    window: {
      devicePixelRatio: 3,
      matchMedia: () => ({ matches: reduced }),
      addEventListener: (name, callback) => windowEvents.set(name, callback),
      removeEventListener: (name) => windowEvents.delete(name),
    },
    ResizeObserver, IntersectionObserver,
    requestAnimationFrame: requestFrame,
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  mod.exports.default({ origin: 'top-right', rayColor1: '#FFC46B', rayColor2: '#96c8ff', followMouse: false, intro: false, maxDevicePixelRatio: 1 });
  refs[0].current = container;
  refs[1].current = canvas;
  const cleanups = effects.map((effect) => effect());
  return {
    frames, calls, canvas, document, windowEvents,
    visible: (value) => intersection([{ isIntersecting: value }]),
    visibility: (hidden) => { document.hidden = hidden; document.visibilityState = hidden ? 'hidden' : 'visible'; documentEvents.get('visibilitychange')(); },
    flush(now) { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); },
    dispose() { for (const cleanup of cleanups) cleanup?.(); },
  };
}


test('Education rays use the top-right origin and supplied colors with capped resolution', () => {
  const env = mount();
  env.visible(true);
  env.flush(100);
  const colorsAndFrame = env.calls.filter(([name]) => name === 'uniform3f');
  assert.deepEqual(colorsAndFrame[0].slice(2), [1, 196 / 255, 107 / 255]);
  assert.deepEqual(colorsAndFrame[1].slice(2), [150 / 255, 200 / 255, 1]);
  assert.deepEqual(colorsAndFrame[2].slice(2), [0, 0, 0], 'no horizontal/vertical flip or side origin');
  assert.equal(env.canvas.width, 650);
  env.dispose();
});

test('Education rays stop immediately offscreen or in a hidden tab and resume on return', () => {
  const env = mount();
  assert.equal(env.frames.size, 0);
  env.visible(true);
  env.flush(100);
  assert.equal(env.frames.size, 1);
  env.visible(false);
  assert.equal(env.frames.size, 0);
  env.visible(true);
  env.visibility(true);
  assert.equal(env.frames.size, 0);
  env.visibility(false);
  assert.equal(env.frames.size, 1);
  env.dispose();
  assert.equal(env.frames.size, 0);
  assert.equal(env.windowEvents.size, 0);
  assert.ok(env.calls.some(([name]) => name === 'deleteProgram'));
});

test('reduced-motion Education rays render once and missing WebGL remains harmless', () => {
  const env = mount({ reduced: true });
  env.visible(true);
  env.flush(100);
  assert.equal(env.frames.size, 0);
  const sway = env.calls.filter(([name]) => name === 'uniform1f').at(-1);
  assert.equal(sway[2], 0);
  env.dispose();
  const fallback = mount({ webgl: false });
  assert.equal(fallback.frames.size, 0);
  assert.equal(fallback.calls.length, 0);
  fallback.dispose();
});
