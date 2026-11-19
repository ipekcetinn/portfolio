import type { RopeNode, RopeRange, RopeVector } from './yarnPhysics';

interface WoolDetail {
  t: number;
  material: number;
  drift: number;
  radius: number;
  twist: number;
  hair: boolean;
  side: number;
  hairLength: number;
  hairAlong: number;
}
export interface YarnMaterial {
  segments: readonly (readonly WoolDetail[])[];
  tip: WoolDetail;
}
export interface WoolSample extends WoolDetail {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

// This noise is evaluated at layout time, never against time or screen position.
function hash(seed: number, salt = 0) {
  const value = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
function smoothNoise(position: number, salt: number) {
  const cell = Math.floor(position);
  const t = position - cell;
  const blend = t * t * t * (t * (t * 6 - 15) + 10);
  return (hash(cell, salt) * (1 - blend) + hash(cell + 1, salt) * blend) * 2 - 1;
}

/** Cache material properties once per layout. Node movement does not reseed them. */
export function createYarnMaterial(points: readonly RopeVector[]): YarnMaterial {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let previousCell = -1;
  const detail = (material: number, t: number): WoolDetail => {
    const taper = Math.min(1, material / 55, (total - material) / 55);
    const density = .36 + smoothNoise(material / 110, 9) * .16;
    const cell = Math.floor(material / 7);
    const hair = cell !== previousCell && hash(cell, 14) < density;
    previousCell = cell;
    return {
      t, material,
      drift: (smoothNoise(material / 135, 27) * 2.3 + smoothNoise(material / 47, 6) * .55) *
        (.6 + smoothNoise(material / 310, 38) * .28) * Math.max(0, taper),
      radius: 1.56 * (1 + smoothNoise(material / 68, 3) * .085 + smoothNoise(material / 19, 8) * .035),
      twist: material * Math.PI * 2 / 16 + smoothNoise(material / 83, 21) * .65 + smoothNoise(material / 24, 44) * .18,
      hair, side: hash(cell, 17) < .5 ? -1 : 1,
      hairLength: .6 + hash(cell, 31) * 1.65,
      hairAlong: (hash(cell, 49) - .5) * 3.4,
    };
  };
  let distance = 0;
  const segments = lengths.map(length => {
    const steps = Math.min(40, Math.max(4, Math.ceil(length / 2.4)));
    const samples = Array.from({ length: steps }, (_, i) => detail(distance + length * i / steps, i / steps));
    distance += length;
    return samples;
  });
  return { segments, tip: detail(total, 1) };
}

// An approximating B-spline spreads a turn across neighbouring physics points.
// Unlike interpolating Catmull-Rom, it does not force the yarn through a tight kink.
function cubic(a: number, b: number, c: number, d: number, t: number) {
  const u = 1 - t;
  return (u * u * u * a + (3 * t * t * t - 6 * t * t + 4) * b +
    (-3 * t * t * t + 3 * t * t + 3 * t + 1) * c + t * t * t * d) / 6;
}
function tangent(a: number, b: number, c: number, d: number, t: number) {
  return (-3 * (1 - t) ** 2 * a + (9 * t * t - 12 * t) * b +
    (-9 * t * t + 6 * t + 3) * c + 3 * t * t * d) / 6;
}

/** A visual centreline only; it never writes back into the physics nodes. */
export function sampleYarnAppearance(
  nodes: readonly RopeNode[], range: RopeRange, material: YarnMaterial, viewportTop: number, width: number,
): WoolSample[] {
  const samples: WoolSample[] = [];
  const softened = new Map<number, RopeVector>();
  const position = (index: number): RopeVector => {
    const cached = softened.get(index);
    if (cached) return cached;
    const last = nodes.length - 1;
    let point: RopeVector;
    if (index < 0 || index > last) {
      // Extrapolation keeps the actual rope endpoints anchored after smoothing.
      const end = nodes[index < 0 ? 0 : last].pos;
      const adjacent = position(index < 0 ? 1 : last - 1);
      point = { x: end.x * 2 - adjacent.x, y: end.y * 2 - adjacent.y };
    } else if (index === 0 || index === last) point = nodes[index].pos;
    else {
      const before = nodes[index - 1].pos;
      const current = nodes[index].pos;
      const after = nodes[index + 1].pos;
      point = { x: (before.x + current.x * 2 + after.x) / 4,
        y: (before.y + current.y * 2 + after.y) / 4 };
    }
    softened.set(index, point);
    return point;
  };
  const append = (index: number, detail: WoolDetail) => {
    const a = position(index - 1);
    const b = position(index);
    const c = position(index + 1);
    const d = position(index + 2);
    const t = detail.t;
    const dx = tangent(a.x, b.x, c.x, d.x, t);
    const dy = tangent(a.y, b.y, c.y, d.y, t);
    const length = Math.max(.001, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const x = cubic(a.x, b.x, c.x, d.x, t);
    const y = cubic(a.y, b.y, c.y, d.y, t);
    const edge = Math.min(1, Math.max(0, (Math.min(x, width - x) - 2) / 5));
    samples.push({ ...detail, x: x + nx * detail.drift * edge,
      y: y + ny * detail.drift * edge - viewportTop, nx, ny });
  };
  if (nodes.length < 2) return samples;
  for (let i = range.start; i < range.end; i++) {
    for (const detail of material.segments[i] ?? []) append(i, detail);
  }
  if (range.end > range.start) {
    const detail = range.end === nodes.length - 1 ? material.tip : material.segments[range.end][0];
    append(range.end - 1, { ...detail, t: 1 });
  }
  // Follow the displaced centreline, keeping body, twist and loose fibres together.
  for (let i = 1; i < samples.length - 1; i++) {
    const before = samples[i - 1];
    const after = samples[i + 1];
    const length = Math.max(.001, Math.hypot(after.x - before.x, after.y - before.y));
    samples[i].nx = -(after.y - before.y) / length;
    samples[i].ny = (after.x - before.x) / length;
  }
  return samples;
}

/** Matte ribbons give the body real width variation without per-segment stroke seams. */
export function drawYarnAppearance(context: CanvasRenderingContext2D, samples: readonly WoolSample[]) {
  if (samples.length < 2) return;
  const ribbon = (scale: number, extra: number, offset: number, color: string) => {
    context.beginPath();
    samples.forEach((p, i) => {
      const radius = p.radius * scale + extra;
      const x = p.x + p.nx * (radius + offset);
      const y = p.y + p.ny * (radius + offset);
      if (!i) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    for (let i = samples.length - 1; i >= 0; i--) {
      const p = samples[i];
      const radius = p.radius * scale + extra;
      context.lineTo(p.x + p.nx * (-radius + offset), p.y + p.ny * (-radius + offset));
    }
    context.closePath();
    context.fillStyle = color;
    context.fill();
  };
  ribbon(1, .85, 0, 'rgba(182, 148, 106, .055)');
  ribbon(1, .35, 0, 'rgba(84, 59, 39, .34)');
  ribbon(1, 0, 0, 'rgba(194, 165, 123, .55)');
  ribbon(.55, 0, -.3, 'rgba(226, 204, 165, .16)');

  for (let ply = 0; ply < 3; ply++) {
    for (let face = 0; face < 2; face++) {
      context.beginPath();
      let connected = false;
      for (const p of samples) {
        const phase = p.twist + ply * Math.PI * 2 / 3;
        if ((Math.cos(phase) >= 0) !== (face === 1)) { connected = false; continue; }
        const offset = Math.sin(phase) * p.radius * .66;
        const x = p.x + p.nx * offset;
        const y = p.y + p.ny * offset;
        if (!connected) context.moveTo(x, y);
        else context.lineTo(x, y);
        connected = true;
      }
      context.lineWidth = face ? .7 : .55;
      context.strokeStyle = face ? 'rgba(236, 214, 175, .31)' : 'rgba(88, 61, 40, .29)';
      context.stroke();
    }
  }
  context.beginPath();
  for (const p of samples) {
    if (!p.hair) continue;
    const root = p.side * p.radius * .85;
    const tip = p.side * (p.radius + p.hairLength);
    context.moveTo(p.x + p.nx * root, p.y + p.ny * root);
    context.quadraticCurveTo(p.x + p.nx * tip - p.ny * p.hairAlong * .25,
      p.y + p.ny * tip + p.nx * p.hairAlong * .25,
      p.x + p.nx * tip * .85 - p.ny * p.hairAlong,
      p.y + p.ny * tip * .85 + p.nx * p.hairAlong);
  }
  context.lineWidth = .32;
  context.strokeStyle = 'rgba(222, 198, 159, .27)';
  context.stroke();
}
