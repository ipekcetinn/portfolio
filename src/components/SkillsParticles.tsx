import { useCallback, useSyncExternalStore } from 'react';
import Particles from './effects/Particles';

function useMediaQuery(query: string) {
  const subscribe = useCallback((listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export function SkillsParticles() {
  const compact = useMediaQuery('(max-width: 768px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return (
    <div className="skills-particles" aria-hidden="true">
      <Particles
        key={reducedMotion ? 'static' : 'animated'}
        particleColors={['#e8d6ad', '#ceb68c', '#f0dfbc']}
        particleCount={compact ? 180 : 360}
        particleSpread={9}
        particleBaseSize={compact ? 100 : 125}
        speed={0.035}
        shape="sparkle"
        glow={0.25}
        twinkle={0.15}
        alphaParticles
        connections
        connectionDistance={compact ? 80 : 115}
        moveParticlesOnHover={!compact && !reducedMotion}
        particleHoverFactor={0.25}
        clickBurst={false}
        popOnClick
        disableRotation
        intro={false}
        opacity={0.9}
        pixelRatio={compact ? 1 : 1.25}
        paused={reducedMotion}
      />
    </div>
  );
}
