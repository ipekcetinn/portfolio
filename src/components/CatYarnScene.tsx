import { useEffect, useRef } from 'react';
import { mountCatYarnScene } from '../lib/catYarnScene';
import './CatYarnScene.css';

export function CatYarnScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pawRef = useRef<HTMLImageElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sceneRef.current || !triggerRef.current || !pawRef.current || !ballRef.current) return;
    return mountCatYarnScene(sceneRef.current, triggerRef.current, pawRef.current, ballRef.current);
  }, []);
  return (
    <div className="cat-yarn-scene wrap" ref={sceneRef}>
      <button className="cat-yarn-scene__stage" type="button" ref={triggerRef}
        aria-label="Let the cat gently play with the yarn">
        <img className="cat-yarn-scene__paw" ref={pawRef}
          src="/assets/cat-yarn/cat-paw.png" alt="" width="1254" height="1254"
          loading="lazy" decoding="async" draggable={false} />
        <img className="cat-yarn-scene__body"
          src="/assets/cat-yarn/cat-body.png" alt="" width="1254" height="1254"
          loading="lazy" decoding="async" draggable={false} />
        <div className="cat-yarn-scene__ball" ref={ballRef}>
          <img src="/assets/cat-yarn/yarn-ball.png" alt="" width="1254" height="1254"
            loading="lazy" decoding="async" draggable={false} />
          <span className="cat-yarn-scene__anchor" data-yarn-anchor="" aria-hidden="true" />
        </div>
      </button>
    </div>
  );
}
