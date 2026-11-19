import { useState, useSyncExternalStore, type ReactNode } from 'react';
import TearTicket from './effects/TearTicket';

const query = '(max-width: 1024px)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const compactSnapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export function AboutTicket({ children }: { children: ReactNode }) {
  const [torn, setTorn] = useState(false);
  const compact = useSyncExternalStore(subscribe, compactSnapshot, serverSnapshot);

  return (
    <div className="about-ticket">
      <TearTicket
        stub={
          <div className="about-ticket__stub">
            <span className="about-ticket__location">ANKARA<br />TÜRKİYE</span>
            <span>COMPUTER<br />ENGINEERING</span>
            <small>PULL TO TEAR</small>
          </div>
        }
        orientation={compact ? 'vertical' : 'horizontal'}
        scrim={false}
        torn={torn}
        onTear={() => setTorn(true)}
        width={compact ? 360 : 540}
        height={compact ? 640 : 490}
        stubSize={compact ? 90 : 120}
        radius={16}
        holes={12}
        holeSize={6}
        notch={3}
        roughness={0}
        tearAngle={30}
        stretch={30}
        resistance={0.45}
        rotate={compact ? -1 : -3}
        tilt={!compact}
        tiltMax={6}
        tiltReach={260}
        parallax={2}
        perspective={1000}
        background="#d8c6a6"
        color="#31241e"
        border
        borderWidth={1}
        recenter={false}
        ariaLabel="Tear off the About Me ticket stub."
      >
        <div className="about-ticket__content">
          <span className="about-ticket__name">İpek Çetin</span>
          {children}
        </div>
      </TearTicket>
      <div className="about-ticket__controls">
        <button type="button" disabled={!torn} onClick={() => setTorn(false)}>Restore ticket</button>
      </div>
    </div>
  );
}
