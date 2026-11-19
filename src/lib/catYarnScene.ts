/** One short, idle-separated gesture. Body and rope anchor are never animated. */
export function mountCatYarnScene(
  scene: HTMLElement, trigger: HTMLButtonElement, paw: HTMLElement, ball: HTMLElement,
) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const label = trigger.getAttribute('aria-label') || '';
  const images = [...scene.querySelectorAll<HTMLImageElement>('img')];
  let visible = false;
  let disposed = false;
  let running = false;
  let timer = 0;
  let generation = 0;
  let idleIndex = 0;
  let animations: Animation[] = [];
  const idleDelays = [6800, 10400, 8300, 12200];

  function clearTimer() {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  }
  function stop() {
    generation++;
    clearTimer();
    animations.forEach(animation => animation.cancel());
    animations = [];
    running = false;
  }
  function available() {
    return !disposed && visible && !document.hidden && !motion.matches &&
      images.every(image => image.complete && image.naturalWidth > 0);
  }
  function schedule(first = false) {
    clearTimer();
    if (!available() || running) return;
    timer = window.setTimeout(() => { timer = 0; play(); },
      first ? 4200 : idleDelays[idleIndex++ % idleDelays.length]);
  }
  function play() {
    if (!available() || running || (typeof paw.animate !== 'function' || typeof ball.animate !== 'function')) return;
    clearTimer();
    running = true;
    const current = ++generation;
    const options: KeyframeAnimationOptions = { duration: 3300, iterations: 1, fill: 'none',
      easing: 'linear' };
    const ease = 'cubic-bezier(.42, 0, .2, 1)';
    animations = [
      paw.animate([
        { transform: 'rotate(0deg)', offset: 0, easing: ease },
        { transform: 'rotate(0deg)', offset: .14, easing: ease },
        { transform: 'rotate(32deg)', offset: .43, easing: 'ease-in-out' },
        { transform: 'rotate(34deg)', offset: .52, easing: ease },
        { transform: 'rotate(0deg)', offset: .79, easing: ease },
        { transform: 'rotate(0deg)', offset: 1 },
      ], options),
      ball.animate([
        { transform: 'rotate(0deg)', offset: 0 },
        { transform: 'rotate(0deg)', offset: .43, easing: 'ease-out' },
        { transform: 'rotate(-7deg)', offset: .52, easing: 'ease-in-out' },
        { transform: 'rotate(3.1deg)', offset: .66, easing: 'ease-in-out' },
        { transform: 'rotate(-1.3deg)', offset: .8, easing: 'ease-in-out' },
        { transform: 'rotate(.35deg)', offset: .91, easing: 'ease-in-out' },
        { transform: 'rotate(0deg)', offset: 1 },
      ], options),
    ];
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (disposed || current !== generation) return;
      animations.forEach(animation => animation.cancel());
      animations = [];
      running = false;
      schedule();
    }, () => { /* Cancellation on unmount/offscreen is expected. */ });
  }
  const click = () => play();
  const imageLoaded = () => schedule(true);
  const enter = (event: PointerEvent) => { if (event.pointerType === 'mouse') play(); };
  const preferenceChanged = () => {
    stop();
    trigger.disabled = motion.matches;
    trigger.setAttribute('aria-label', motion.matches ? 'Seated cat beside a ball of yarn' : label);
    schedule(true);
  };
  const visibilityChanged = () => {
    stop();
    if (!document.hidden) schedule(true);
  };
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .2);
    if (visible) schedule(true);
    else stop();
  }, { threshold: .2 });
  observer.observe(scene);
  scene.addEventListener('load', imageLoaded, true);
  trigger.addEventListener('click', click);
  trigger.addEventListener('pointerenter', enter);
  motion.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', visibilityChanged);
  preferenceChanged();

  return () => {
    disposed = true;
    stop();
    observer.disconnect();
    scene.removeEventListener('load', imageLoaded, true);
    trigger.removeEventListener('click', click);
    trigger.removeEventListener('pointerenter', enter);
    motion.removeEventListener('change', preferenceChanged);
    document.removeEventListener('visibilitychange', visibilityChanged);
    trigger.disabled = false;
    trigger.setAttribute('aria-label', label);
  };
}
