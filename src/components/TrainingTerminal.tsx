import { useCallback, useSyncExternalStore } from 'react';
import FaultyTerminal from './effects/FaultyTerminal';

function useMediaQuery(query: string) {
  const subscribe = useCallback((listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function TrainingTerminal() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const compact = useMediaQuery('(max-width: 768px)');

  return (
    <div className="training-terminal" aria-hidden="true">
      <FaultyTerminal
        key={reducedMotion ? 'static' : 'animated'}
        tint="#5b0f0f"
        glyphs="blocks"
        scale={1.5}
        digitSize={1.2}
        timeScale={0.5}
        brightness={0.75}
        glow={0.5}
        persistence={0.5}
        mouseStrength={0.5}
        mouseGlow={0.6}
        curvature={0.1}
        vignette={0.25}
        clickEffect={reducedMotion ? 'none' : 'glitch'}
        mouseReact={!reducedMotion}
        pause={reducedMotion}
        dpr={compact ? 1 : 1.25}
      />
    </div>
  );
}
