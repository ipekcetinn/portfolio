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
    getShaderParameter: () => true,
    getProgramParameter: (program, parameter) => parameter === 3 ? 0 : true,
  }, {
    get(target, key) {
      if (key in target) return target[key];
      if (/^[A-Z_0-9]+$/.test(key)) return 4;
      return (...args) => { calls.push([key, ...args]); return {}; };
    },
  });
  const container = { clientWidth: 650, clientHeight: 600 };
  const canvas = { getContext: () => webgl ? gl : null };
  const hookReact = {
    useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
    useEffect(effect) { effects.push(effect); },
  };
  const mod = { exports: {} };
  const document = {
    hidden: false,
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
  const source = fs.readFileSync(path.join(__dirname, '../src/components/effects/FaultyTerminal.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: mod.exports, module: mod,
    require: (name) => name === 'react' ? hookReact : require(name),
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
  mod.exports.default({ mouseReact: false, clickEffect: 'none', pageLoadAnimation: false, dpr: 1 });
  refs[0].current = container;
  refs[1].current = canvas;
  const cleanups = effects.map((effect) => effect());
  return {
    frames, calls, canvas, document, windowEvents,
    visible: (value) => intersection([{ isIntersecting: value }]),
    visibility: (hidden) => { document.hidden = hidden; documentEvents.get('visibilitychange')(); },
    flush(now) { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); },
    dispose() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test('terminal pauses offscreen and in hidden tabs, then resumes without pointer listeners', () => {
  const env = mount();
  assert.equal(env.frames.size, 0, 'no ongoing work before the section enters view');
  assert.equal(env.windowEvents.size, 0, 'decorative terminal does not listen to pointer input');
  assert.equal(env.canvas.width, 650, 'DPR remains capped by the local setting');
  env.visible(true);
  assert.equal(env.frames.size, 1);
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
});

test('reduced motion renders a static terminal without a continuous animation loop', () => {
  const env = mount({ reduced: true });
  env.visible(true);
  env.flush(100);
  assert.equal(env.frames.size, 0);
  env.dispose();
});

test('terminal unmount releases GPU resources and observers without losing the reusable canvas context', () => {
  const env = mount();
  env.visible(true);
  env.dispose();
  assert.equal(env.frames.size, 0);
  for (const method of ['deleteTexture', 'deleteFramebuffer', 'deleteVertexArray', 'deleteProgram', 'resizeDisconnect', 'intersectionDisconnect']) {
    assert.ok(env.calls.some(([name]) => name === method), method);
  }
  assert.ok(!env.calls.some(([name]) => name === 'getExtension'), 'StrictMode must be able to reuse the context');
});

test('terminal leaves the existing layout intact when WebGL is unavailable', () => {
  const env = mount({ webgl: false });
  assert.equal(env.frames.size, 0);
  assert.equal(env.calls.length, 0);
  env.dispose();
});
