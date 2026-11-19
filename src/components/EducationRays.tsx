import { useCallback, useSyncExternalStore } from 'react';
import SideRays from './effects/SideRays';

function useMediaQuery(query: string) {
  const subscribe = useCallback((listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function EducationRays() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const compact = useMediaQuery('(max-width: 768px)');

  return (
    <div className="education-rays" aria-hidden="true">
      <SideRays
        key={reducedMotion ? 'static' : 'animated'}
        rayColor1="#FFC46B"
        rayColor2="#96c8ff"
        origin="top-right"
        speed={2.5}
        intensity={2}
        spread={2}
        density={5}
        sharpness={0.25}
        glow={0.65}
        followMouse={!compact && !reducedMotion}
        maxDevicePixelRatio={compact ? 1 : 1.25}
      />
    </div>
  );
}
