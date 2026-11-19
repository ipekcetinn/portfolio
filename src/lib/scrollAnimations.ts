// Scroll updates write CSS variables directly, without React renders on every frame.
export function initializeScrollAnimations(): () => void {
  const cleanups: (() => void)[] = [];
  const heroStage = document.getElementById('hero-stage');
  const heroPanel = heroStage?.querySelector('.hero');
  const spiral = document.getElementById('hero-spiral');

  // CSS supplies a full-screen, static hero when JavaScript is unavailable.
  if (heroStage && heroPanel instanceof HTMLElement && spiral) {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let needsMeasure = true;
    let stageTop = 0;
    let holdDistance = 1;
    let transitionDistance = 1;
    let backgroundDistance = 1;
    let previousBackgroundOpacity = -1;
    let previousAngle = -1;
    let currentAngle = 0;
    let previousFrameTime: number | null = null;
    let previousFade = -1;
    let titleDistance = 0;
    let catDistance = 0;
    let enabled = false;

    function render(timestamp: number) {
      frame = 0;
      if (!enabled || !heroStage || !(heroPanel instanceof HTMLElement) || !spiral) return;
      // Layout reads are restricted to initialization and viewport changes.
      if (needsMeasure) {
        stageTop = heroStage.getBoundingClientRect().top + window.scrollY;
        holdDistance = Math.max(1, heroStage.offsetHeight - heroPanel.offsetHeight);
        // The diagonal is sufficient at every angle, without the extra 145vmax zoom.
        const spiralSize = Math.ceil(Math.hypot(heroPanel.offsetWidth, heroPanel.offsetHeight)) + 2;
        spiral.style.setProperty('--spiral-size', spiralSize + 'px');
        transitionDistance = holdDistance + heroPanel.offsetHeight * .45;
        backgroundDistance = Math.max(holdDistance, heroPanel.offsetHeight * 1.1);
        previousBackgroundOpacity = -1;
        titleDistance = Math.min(44, heroPanel.offsetHeight * .045);
        catDistance = Math.min(26, heroPanel.offsetHeight * .025);
        previousFade = -1;
        needsMeasure = false;
      }
      // Keep the original rotation speed, but continue through the full background fade.
      // Releasing the sticky hero must not freeze a spiral that is still visible.
      const rotationScroll = Math.min(backgroundDistance, Math.max(0, window.scrollY - stageTop));
      const targetAngle = rotationScroll / holdDistance * 150;
      // A short, time-based ease-out follows the scroll target at any refresh rate.
      // Snap on initialization or once invisible; otherwise settle without overshoot.
      const deltaTime = previousFrameTime === null ? 1000 / 60 :
        Math.min(64, Math.max(0, timestamp - previousFrameTime));
      previousFrameTime = timestamp;
      if (previousAngle < 0 || rotationScroll >= backgroundDistance) {
        currentAngle = targetAngle;
      } else {
        currentAngle += (targetAngle - currentAngle) * (1 - Math.exp(-deltaTime / 100));
      }
      const isSettling = Math.abs(targetAngle - currentAngle) > .05;
      if (!isSettling) currentAngle = targetAngle;
      const angle = Math.round(currentAngle * 100) / 100;
      // Only the spiral eases; foreground and opacity remain tied to scroll position.
      if (angle !== previousAngle) {
        spiral.style.setProperty('--spiral-rotation', angle + 'deg');
        previousAngle = angle;
      }
      // Fade only the background, independently of the existing foreground motion.
      const backgroundProgress = Math.min(1, Math.max(0,
        (window.scrollY - stageTop) / backgroundDistance));
      const backgroundOpacity = Math.round((1 - backgroundProgress * backgroundProgress *
        (3 - 2 * backgroundProgress)) * 10000) / 10000;
      if (backgroundOpacity !== previousBackgroundOpacity) {
        heroPanel.style.setProperty('--spiral-opacity', String(backgroundOpacity));
        previousBackgroundOpacity = backgroundOpacity;
      }
      // Smoothstep shapes the scroll mapping, not a time-based animation loop.
      const revealProgress = (window.scrollY - stageTop) / transitionDistance;
      const fadeProgress = Math.min(1, Math.max(0, (revealProgress - .08) / .92));
      const fade = Math.round(fadeProgress * fadeProgress * (3 - 2 * fadeProgress) * 10000) / 10000;
      if (fade !== previousFade) {
        heroPanel.style.setProperty('--hero-fade', String(fade));
        heroPanel.style.setProperty('--hero-title-y', -(titleDistance * fade).toFixed(2) + 'px');
        heroPanel.style.setProperty('--hero-cat-y', -(catDistance * fade).toFixed(2) + 'px');
        previousFade = fade;
      }
      // Stop scheduling frames as soon as the spiral reaches its target.
      if (isSettling) frame = window.requestAnimationFrame(render);
    }

    function requestRender() {
      if (!frame && enabled) {
        previousFrameTime = null;
        frame = window.requestAnimationFrame(render);
      }
    }

    function measureOnNextFrame() {
      needsMeasure = true;
      requestRender();
    }

    function updateMotionPreference() {
      enabled = !motionPreference.matches;
      heroStage?.classList.toggle('is-scroll-driven', enabled);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener('scroll', requestRender);
      window.removeEventListener('resize', measureOnNextFrame);
      window.removeEventListener('pageshow', measureOnNextFrame);
      if (enabled) {
        needsMeasure = true;
        previousAngle = -1;
        window.addEventListener('scroll', requestRender, { passive: true });
        window.addEventListener('resize', measureOnNextFrame, { passive: true });
        window.addEventListener('pageshow', measureOnNextFrame);
        requestRender();
      } else {
        spiral?.style.removeProperty('--spiral-rotation');
        if (heroPanel instanceof HTMLElement) {
          for (const property of ['--hero-fade', '--hero-title-y', '--hero-cat-y', '--spiral-opacity']) {
            heroPanel.style.removeProperty(property);
          }
        }
        previousFade = -1;
      }
    }

    motionPreference.addEventListener('change', updateMotionPreference);
    updateMotionPreference();
    cleanups.push(() => {
      enabled = false;
      motionPreference.removeEventListener('change', updateMotionPreference);
      window.removeEventListener('scroll', requestRender);
      window.removeEventListener('resize', measureOnNextFrame);
      window.removeEventListener('pageshow', measureOnNextFrame);
      if (frame) window.cancelAnimationFrame(frame);
      heroStage.classList.remove('is-scroll-driven');
      spiral.style.removeProperty('--spiral-rotation');
      spiral.style.removeProperty('--spiral-size');
      for (const property of ['--hero-fade', '--hero-title-y', '--hero-cat-y', '--spiral-opacity']) {
        heroPanel.style.removeProperty(property);
      }
    });
  }

  // Reveal the lower editorial surface from scroll position, without timers or snapping.
  const scrapbook = document.getElementById('about');
  if (scrapbook) {
    const revealItems = [...scrapbook.querySelectorAll('[data-reveal]')]
      .filter((item) => item instanceof HTMLElement);
    const revealPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let revealEnabled = false;
    let revealFrame = 0;
    let revealNeedsMeasure = true;
    let revealViewportHeight = 1;
    let revealGeometry: { element: HTMLElement; top: number; previous: number }[] = [];
    const revealObserver = typeof window.ResizeObserver === 'function'
      ? new window.ResizeObserver(refreshReveals)
      : null;

    function renderReveals() {
      revealFrame = 0;
      if (!revealEnabled) return;
      if (revealNeedsMeasure) {
        revealViewportHeight = Math.max(1, window.innerHeight);
        // Batch every layout read before applying transforms or opacity.
        const previousOffsets = new Map(revealGeometry.map((item) =>
          [item.element, item.previous >= 0 ? (1 - item.previous) * 20 : 0]));
        revealGeometry = revealItems.map((element) => ({
          element,
          top: element.getBoundingClientRect().top + window.scrollY - (previousOffsets.get(element) || 0),
          previous: -1,
        }));
        revealNeedsMeasure = false;
      }
      for (const item of revealGeometry) {
        const progress = Math.min(1, Math.max(0,
          (window.scrollY + revealViewportHeight * .92 - item.top) / (revealViewportHeight * .48)));
        const opacity = Math.round(progress * progress * (3 - 2 * progress) * 1000) / 1000;
        if (opacity !== item.previous) {
          item.element.style.setProperty('--reveal-opacity', String(opacity));
          item.element.style.setProperty('--reveal-y', ((1 - opacity) * 20).toFixed(2) + 'px');
          item.previous = opacity;
        }
      }
      scrapbook?.classList.add('reveal-ready');
    }

    function requestReveals() {
      if (revealEnabled && !revealFrame) {
        revealFrame = window.requestAnimationFrame(renderReveals);
      }
    }

    function refreshReveals() {
      revealNeedsMeasure = true;
      requestReveals();
    }

    function updateRevealPreference() {
      revealEnabled = !revealPreference.matches;
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
      revealFrame = 0;
      window.removeEventListener('scroll', requestReveals);
      window.removeEventListener('resize', refreshReveals);
      window.removeEventListener('pageshow', refreshReveals);
      window.removeEventListener('load', refreshReveals);
      revealObserver?.disconnect();
      if (revealEnabled) {
        window.addEventListener('scroll', requestReveals, { passive: true });
        window.addEventListener('resize', refreshReveals, { passive: true });
        window.addEventListener('pageshow', refreshReveals);
        window.addEventListener('load', refreshReveals);
        if (scrapbook) revealObserver?.observe(scrapbook);
        refreshReveals();
      } else {
        scrapbook?.classList.remove('reveal-ready');
        revealGeometry = [];
        for (const element of revealItems) {
          element.style.removeProperty('--reveal-opacity');
          element.style.removeProperty('--reveal-y');
        }
      }
    }

    revealPreference.addEventListener('change', updateRevealPreference);
    document.fonts?.ready.then(refreshReveals);
    updateRevealPreference();
    cleanups.push(() => {
      revealEnabled = false;
      revealPreference.removeEventListener('change', updateRevealPreference);
      window.removeEventListener('scroll', requestReveals);
      window.removeEventListener('resize', refreshReveals);
      window.removeEventListener('pageshow', refreshReveals);
      window.removeEventListener('load', refreshReveals);
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
      revealObserver?.disconnect();
      scrapbook.classList.remove('reveal-ready');
      for (const element of revealItems) {
        element.style.removeProperty('--reveal-opacity');
        element.style.removeProperty('--reveal-y');
      }
    });
  }
  return () => { for (const cleanup of cleanups) cleanup(); };
}
