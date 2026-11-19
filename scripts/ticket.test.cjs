const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function mountTicket({ reduced = false, disabled = false } = {}) {
  const refs = [];
  const effects = [];
  const frames = new Map();
  const events = new Map();
  const attributes = new Map();
  let clock = 0;
  let nextFrame = 1;
  let tears = 0;
  const hooks = {
    useState: (value) => [value, () => {}],
    useRef(value) { const ref = { current: value }; refs.push(ref); return ref; },
    useMemo: (callback) => callback(),
    useEffect: (callback) => effects.push(callback),
    useLayoutEffect: (callback) => effects.push(callback),
  };
  const motion = {
    motion: { div: 'div', img: 'img' },
    useMotionTemplate: () => '',
    useReducedMotion: () => reduced,
    useSpring: () => ({ set() {} }),
    useTransform: () => 0,
  };
  const mod = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/components/effects/TearTicket.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: mod.exports, module: mod,
    require: (name) => name === 'react' ? hooks : name === 'motion/react' ? motion : name.endsWith('.css') ? {} : require(name),
    window: {
      addEventListener: (name, callback) => events.set(name, callback),
      removeEventListener: (name) => events.delete(name),
    },
    ResizeObserver: class { observe() {} disconnect() {} },
    performance: { now: () => clock },
    requestAnimationFrame: (callback) => { const id = nextFrame++; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  const tree = mod.exports.default({ width: 460, height: 360, stubSize: 120, disabled, onTear: () => { tears++; } });
  const rect = { left: 0, top: 0, width: 320, height: 360 * 320 / 460 };
  refs[0].current = {
    clientWidth: 320,
    getBoundingClientRect: () => rect,
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
  };
  refs[1].current = { getBoundingClientRect: () => rect };
  refs[2].current = { style: {} };
  refs[3].current = {
    style: {}, setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {},
  };
  const cleanups = effects.map((effect) => effect());
  function findStub(element) {
    if (!element || typeof element !== 'object') return null;
    if (element.props?.role === 'button') return element;
    const children = element.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = findStub(child);
      if (found) return found;
    }
    return null;
  }
  const stub = findStub(tree);
  assert.ok(stub);
  function flush() {
    clock += 1000 / 60;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(clock);
  }
  const pointer = (x, y) => ({ pointerId: 1, button: 0, clientX: x, clientY: y, currentTarget: refs[3].current });
  return {
    frames, events, attributes, stub, flush, pointer,
    tears: () => tears,
    style: refs[3].current.style,
    dispose() { for (const cleanup of cleanups) cleanup?.(); },
  };
}

test('ticket stub supports keyboard activation without a drag or ongoing physics', () => {
  for (const key of ['Enter', ' ']) {
    const env = mountTicket();
    let prevented = false;
    env.stub.props.onKeyDown({ key, repeat: false, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(env.tears(), 1);
    assert.equal(env.style.visibility, 'hidden');
    assert.equal(env.frames.size, 0);
    env.dispose();
  }
});

test('dragging tears the stub and its falling animation eventually stops', () => {
  const env = mountTicket();
  env.stub.props.onPointerDown(env.pointer(260, 30));
  env.stub.props.onPointerMove(env.pointer(650, 240));
  for (let i = 0; i < 30; i++) env.flush();
  env.stub.props.onPointerUp(env.pointer(650, 240));
  for (let i = 0; i < 200 && env.frames.size; i++) env.flush();
  assert.equal(env.tears(), 1);
  assert.equal(env.style.visibility, 'hidden');
  assert.equal(env.frames.size, 0);
  env.dispose();
});

test('reduced-motion drag tears instantly and disabled tickets stay inert', () => {
  const env = mountTicket({ reduced: true });
  env.stub.props.onPointerDown(env.pointer(260, 30));
  env.stub.props.onPointerMove(env.pointer(330, 30));
  assert.equal(env.tears(), 1);
  assert.equal(env.frames.size, 0);
  assert.equal(env.events.size, 0);
  env.dispose();
  const disabled = mountTicket({ disabled: true });
  disabled.stub.props.onPointerDown(disabled.pointer(260, 30));
  disabled.stub.props.onKeyDown({ key: 'Enter', repeat: false, preventDefault() {} });
  assert.equal(disabled.tears(), 0);
  assert.equal(disabled.frames.size, 0);
  disabled.dispose();
});

test('ticket unmount removes pending drag work and pointer listeners', () => {
  const env = mountTicket();
  env.stub.props.onPointerDown(env.pointer(260, 30));
  assert.equal(env.frames.size, 1);
  env.dispose();
  assert.equal(env.frames.size, 0);
  assert.equal(env.events.size, 0);
});
