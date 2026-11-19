const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function mount({ reduced = false, webgl = true, pop = false } = {}) {
  const effects = [];
  const refs = [];
  const frames = new Map();
  const documentEvents = new Map();
  const windowEvents = new Map();
  const calls = [];
  const sparks = [];
  class Element { closest() { return false; } }
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
  const container = {
    clientWidth: 650, clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 600 }),
    appendChild: (element) => sparks.push(element),
  };
  const canvas = { getContext: () => webgl ? gl : null };
  const hookReact = {
    useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
    useEffect(effect) { effects.push(effect); },
    useLayoutEffect(effect) { effects.push(effect); },
  };
  const mod = { exports: {} };
  const document = {
    hidden: false,
    createElement: () => ({
      getContext: () => null, style: {}, removed: false,
      remove() { this.removed = true; },
      animate() {
        this.animation = { cancel() { this.cancelled = true; } };
        return this.animation;
      },
    }),
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
  const source = fs.readFileSync(path.join(__dirname, '../src/components/effects/Particles.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: mod.exports, module: mod,
    require: (name) => name === 'react' ? hookReact : name.endsWith('.css') ? {} : require(name),
    document,
    window: {
      devicePixelRatio: 3,
      matchMedia: () => ({ matches: reduced }),
      addEventListener: (name, callback) => windowEvents.set(name, callback),
      removeEventListener: (name) => windowEvents.delete(name),
    },
    ResizeObserver, IntersectionObserver, Element,
    requestAnimationFrame: requestFrame,
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  mod.exports.default({ connections: true, clickBurst: false, intro: false, particleCount: 65, particleSpread: 1, pixelRatio: 1, paused: reduced, popOnClick: pop });
  refs[0].current = container;
  refs[1].current = canvas;
  const cleanups = effects.map((effect) => effect());
  return {
    frames, calls, canvas, document, windowEvents, sparks,
    click(x, y, link = false) { const target = new Element(); target.closest = () => link; windowEvents.get('click')({ clientX: x, clientY: y, button: 0, target }); },
    visible: (value) => intersection([{ isIntersecting: value }]),
    visibility: (hidden) => { document.hidden = hidden; documentEvents.get('visibilitychange')(); },
    flush(now) { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(now); },
    dispose() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test('particles pauses offscreen and in hidden tabs, then resumes', () => {
  const env = mount();
  assert.equal(env.frames.size, 0, 'no ongoing work before the section enters view');
  assert.equal(env.windowEvents.size, 5, 'passive pointer listeners preserve scrolling');
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

test('reduced motion renders a static particles without a continuous animation loop', () => {
  const env = mount({ reduced: true });
  env.visible(true);
  env.flush(100);
  assert.equal(env.frames.size, 0);
  env.dispose();
});

test('particles unmount releases GPU resources and observers without losing the reusable canvas context', () => {
  const env = mount();
  env.visible(true);
  env.dispose();
  assert.equal(env.frames.size, 0);
  for (const method of ['deleteBuffer', 'deleteVertexArray', 'deleteProgram', 'resizeDisconnect', 'intersectionDisconnect']) {
    assert.ok(env.calls.some(([name]) => name === method), method);
  }
  assert.ok(!env.calls.some(([name]) => name === 'getExtension'), 'StrictMode must be able to reuse the context');
});

test('particles leaves the existing layout intact when WebGL is unavailable', () => {
  const env = mount({ webgl: false });
  assert.equal(env.frames.size, 0);
  assert.equal(env.calls.length, 0);
  env.dispose();
});

function firstStar(env) {
  const line = env.calls.find(([method, , , data]) => method === 'bufferSubData' && data.length > 8);
  assert.ok(line, 'projected stars form visible connections');
  return [line[3][0], 600 - line[3][1]];
}

test('clicking one star removes only that star and creates a short local burst', () => {
  const env = mount({ pop: true });
  env.visible(true);
  env.flush(100);
  const [x, y] = firstStar(env);
  env.click(-50, -50);
  assert.equal(env.sparks.length, 0, 'background misses do nothing');
  env.click(x, y, true);
  assert.equal(env.sparks.length, 0, 'links keep their behavior');
  env.click(x, y);
  assert.equal(env.sparks.length, 9);
  const removals = env.calls.filter(([method, , , data]) => method === 'bufferSubData' && data.length === 1 && data[0] === 0);
  assert.equal(removals.length, 1, 'only the selected GPU instance is hidden');
  assert.equal(env.sparks[0].style.pointerEvents, 'none');
  for (const spark of env.sparks) spark.animation.onfinish();
  assert.ok(env.sparks.every(spark => spark.removed));
  env.dispose();
});

test('star burst cleans up on leaving the section and reduced motion removes without a burst', () => {
  const env = mount({ pop: true });
  env.visible(true);
  env.flush(100);
  env.click(...firstStar(env));
  env.visible(false);
  assert.ok(env.sparks.every(spark => spark.removed && spark.animation.cancelled));
  assert.equal(env.frames.size, 0);
  env.dispose();
  assert.equal(env.windowEvents.size, 0);
  const reduced = mount({ pop: true, reduced: true });
  reduced.visible(true);
  reduced.flush(100);
  reduced.click(...firstStar(reduced));
  reduced.flush(200);
  assert.equal(reduced.sparks.length, 0);
  assert.equal(reduced.frames.size, 0);
  assert.ok(reduced.calls.some(([method, , , data]) => method === 'bufferSubData' && data.length === 1 && data[0] === 0));
  reduced.dispose();
});
