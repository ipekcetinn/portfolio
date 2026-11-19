import { useEffect, useRef } from 'react';
import { mountYarnRope } from '../lib/yarnRopeScene';

export function YarnRope() {
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const hit = hitRef.current;
    if (!layer || !canvas || !hit) return;
    return mountYarnRope(layer, canvas, hit);
  }, []);

  return (
    <div className="yarn-rope" ref={layerRef} aria-hidden="true">
      <canvas ref={canvasRef} className="yarn-rope__canvas" />
      <svg className="yarn-rope__hit" focusable="false">
        <path ref={hitRef} />
      </svg>
    </div>
  );
}
