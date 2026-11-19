import { createYarnMaterial, sampleYarnAppearance, drawYarnAppearance, type YarnMaterial } from './yarnAppearance';
import { buildYarnPath, type YarnBox } from './yarnPath';
import { sampleYarnContour, segmentBlocked, YarnPhysics, type RopeVector } from './yarnPhysics';

const CONTENT = [
  '.hero-content', '.hero-cat', '.hero-scroll-cue', '.header nav', '.about-copy',
  '.experience-record',
  '.education-heading', '.education-record', '.media-education figcaption',
  '.training-heading', '.training-records', '.skills-spread > div:first-child', '.skill-line',
  '.projects-heading', '.project-manuscript', '.contact-heading', '.archive-contacts',
  '.archive-colophon', '.footer > span', '.footer > a',
].join(',');
const STEP = 1 / 60;
const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], [contenteditable="true"]';

function layoutBox(element: HTMLElement): YarnBox {
  let left = 0;
  let top = 0;
  let current: HTMLElement | null = element;
  while (current) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return { left, top, width: element.offsetWidth, height: element.offsetHeight };
}

export function mountYarnRope(layer: HTMLDivElement, canvas: HTMLCanvasElement, hit: SVGPathElement) {
  const root = document.getElementById('main');
  const context = canvas.getContext('2d', { alpha: true });
  if (!root || !context) return () => {};
  const footer = document.querySelector<HTMLElement>('.footer');
  const catScene = document.querySelector<HTMLElement>('.cat-yarn-scene');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let model: YarnPhysics | null = null;
  let material: YarnMaterial | null = null;
  let obstacles: YarnBox[] = [];
  let viewportObstacles: YarnBox[] = [];
  let sceneControls: YarnBox[] = [];
  let hitObstacles: YarnBox[] = [];
  let width = 1;
  let height = 1;
  let rootTop = 0;
  let viewportTop = 0;
  let ratio = 1;
  let frame = 0;
  let disposed = false;
  let layoutDirty = true;
  let viewDirty = true;
  let dragging: number | null = null;
  let last = 0;
  let accumulator = 0;
  let quietFrames = 0;
  let awake = true;
  let geometryKey = '';

  function releaseCapture() {
    const pointer = dragging;
    dragging = null;
    layer.removeAttribute('data-dragging');
    model?.release();
    if (pointer !== null && hit.hasPointerCapture(pointer)) hit.releasePointerCapture(pointer);
  }

  function measureLayout() {
    layoutDirty = false;
    const origin = layoutBox(root!);
    rootTop = origin.top;
    const localBox = (element: HTMLElement) => {
      const box = layoutBox(element);
      return { ...box, left: box.left - origin.left, top: box.top - origin.top };
    };
    const body = root!.querySelector<HTMLElement>('.scrapbook-body');
    const footerBox = footer ? localBox(footer) : null;
    const pageWidth = root!.clientWidth;
    const catBox = catScene ? localBox(catScene) : null;
    const anchor = catScene?.querySelector<HTMLElement>('[data-yarn-anchor]');
    const anchorBox = anchor ? localBox(anchor) : null;
    const endAnchor = anchorBox ? { x: anchorBox.left, y: anchorBox.top } : undefined;
    const stage = catScene?.querySelector<HTMLElement>('.cat-yarn-scene__stage');
    sceneControls = stage ? [localBox(stage)] : [];
    const pageHeight = Math.max(root!.offsetHeight, footerBox ? footerBox.top + footerBox.height : 0,
      catBox ? catBox.top + catBox.height : 0);
    const sections = [...root!.querySelectorAll<HTMLElement>('.scrap-spread')].map(localBox);
    obstacles = [...document.querySelectorAll<HTMLElement>(CONTENT)].map(localBox);
    const contour = buildYarnPath({ width: pageWidth, height: pageHeight, gutter: body ? localBox(body).left : 20, sections, obstacles, endAnchor });
    const key = JSON.stringify({ contour, pageWidth, pageHeight, obstacles });
    if (key !== geometryKey) {
      releaseCapture();
      geometryKey = key;
      model = new YarnPhysics(sampleYarnContour(contour), pageWidth, pageHeight, obstacles);
      material = createYarnMaterial(model.nodes.map(node => node.rest));
      awake = !preference.matches;
      quietFrames = 0;
    }
    width = Math.max(1, layer.clientWidth);
    height = Math.max(1, layer.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context!.setTransform(ratio, 0, 0, ratio, 0, 0);
    viewDirty = true;
  }

  function updateView() {
    viewDirty = false;
    viewportTop = window.scrollY - rootTop;
    model?.setWindow(viewportTop, viewportTop + height);
    viewportObstacles = obstacles.filter(box => box.top + box.height + 28 >= viewportTop && box.top - 28 <= viewportTop + height);
    hitObstacles = [...viewportObstacles, ...sceneControls];
  }

  function draw() {
    if (!model || !material) return;
    context!.clearRect(0, 0, width, height);
    const { start, end } = model.range;
    const positions = model.nodes.slice(start, end + 1).map(node => node.pos);
    if (positions.length < 2) return;
    context!.save();
    context!.beginPath();
    context!.rect(0, 0, width, height);
    for (const box of viewportObstacles) context!.rect(box.left - 8, box.top - viewportTop - 24, box.width + 16, box.height + 48);
    context!.clip('evenodd');
    context!.lineCap = 'round';
    context!.lineJoin = 'round';

    const samples = sampleYarnAppearance(model.nodes, model.range, material, viewportTop, width);
    drawYarnAppearance(context!, samples);
    context!.restore();

    // Only empty portions of the rope get a touch target; links/text stay unobstructed.
    let d = '';
    let connected = false;
    for (let i = 1; i < positions.length; i++) {
      const a = positions[i - 1];
      const b = positions[i];
      if (segmentBlocked(a, b, hitObstacles, 18)) { connected = false; continue; }
      if (!connected) d += `M${a.x.toFixed(2)} ${(a.y - viewportTop).toFixed(2)}`;
      d += `L${b.x.toFixed(2)} ${(b.y - viewportTop).toFixed(2)}`;
      connected = true;
    }
    hit.setAttribute('d', d);
  }

  function render(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    if (layoutDirty) measureLayout();
    if (viewDirty) updateView();
    if (!model) return;
    const elapsed = last ? Math.min(.05, (now - last) / 1000) : STEP;
    last = now;
    if (!preference.matches && (awake || dragging !== null)) {
      accumulator += elapsed;
      let energy = 0;
      let steps = 0;
      while (accumulator >= STEP && steps < 3) {
        energy = Math.max(energy, model.step(STEP));
        accumulator -= STEP;
        steps++;
      }
      if (steps) quietFrames = energy < .025 && dragging === null ? quietFrames + 1 : 0;
      awake = quietFrames < 20;
    } else if (dragging !== null) model.step(STEP);
    draw();
    if (!preference.matches && (awake || dragging !== null)) frame = window.requestAnimationFrame(render);
  }

  function wake(simulate = false) {
    if (disposed) return;
    if (simulate) { awake = true; quietFrames = 0; }
    if (!frame && !document.hidden) {
      last = 0;
      accumulator = 0;
      frame = window.requestAnimationFrame(render);
    }
  }
  const refresh = () => { layoutDirty = true; wake(); };
  const scroll = () => { releaseCapture(); viewDirty = true; wake(true); };
  const pointerPosition = (event: PointerEvent): RopeVector => ({ x: event.clientX, y: event.clientY + viewportTop });
  const down = (event: PointerEvent) => {
    if (!model || dragging !== null || !event.isPrimary || event.button !== 0) return;
    const target = pointerPosition(event);
    const index = model.nearest(target, event.pointerType === 'touch' ? 26 : 22);
    if (index < 0 || segmentBlocked(target, target, hitObstacles, 10)) return;
    // Do not steal a control activation even if content changes between layout reads.
    const under = document.elementsFromPoint(event.clientX, event.clientY)
      .find(element => !element.closest('.yarn-rope'));
    if (under?.closest(INTERACTIVE)) return;
    if (!model.grab(index, target)) return;
    dragging = event.pointerId;
    layer.setAttribute('data-dragging', '');
    try { hit.setPointerCapture(event.pointerId); }
    catch { releaseCapture(); wake(true); return; }
    if (event.cancelable) event.preventDefault();
    wake(true);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== dragging) return;
    model?.move(pointerPosition(event));
    if (event.cancelable) event.preventDefault();
    wake(true);
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== dragging) return;
    releaseCapture();
    if (preference.matches) model?.resetWindow();
    wake(true);
  };
  const changeMotion = () => { releaseCapture(); model?.resetWindow(); awake = !preference.matches; wake(); };
  const visibility = () => {
    if (document.hidden) {
      releaseCapture();
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    } else { viewDirty = true; wake(true); }
  };

  const resize = new ResizeObserver(refresh);
  resize.observe(root);
  resize.observe(layer);
  if (footer) resize.observe(footer);
  if (catScene) resize.observe(catScene);
  root.querySelectorAll('.scrap-spread, .scrapbook-body').forEach(element => resize.observe(element));
  const mutations = new MutationObserver(refresh);
  mutations.observe(root, { childList: true, characterData: true, subtree: true });
  root.addEventListener('load', refresh, true);
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('scroll', scroll, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  preference.addEventListener('change', changeMotion);
  hit.addEventListener('pointerdown', down);
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerup', up);
  hit.addEventListener('pointercancel', up);
  hit.addEventListener('lostpointercapture', up);
  document.fonts?.ready.then(refresh);
  wake(true);

  return () => {
    disposed = true;
    releaseCapture();
    if (frame) window.cancelAnimationFrame(frame);
    resize.disconnect();
    mutations.disconnect();
    root.removeEventListener('load', refresh, true);
    window.removeEventListener('resize', refresh);
    window.removeEventListener('pageshow', refresh);
    window.removeEventListener('scroll', scroll);
    document.removeEventListener('visibilitychange', visibility);
    preference.removeEventListener('change', changeMotion);
    hit.removeEventListener('pointerdown', down);
    hit.removeEventListener('pointermove', move);
    hit.removeEventListener('pointerup', up);
    hit.removeEventListener('pointercancel', up);
    hit.removeEventListener('lostpointercapture', up);
    hit.removeAttribute('d');
    context.clearRect(0, 0, width, height);
  };
}
