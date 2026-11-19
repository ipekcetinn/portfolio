/*! @license Physics Rope adaptation
 * Copyright (c) 2018 James Wrightson. MIT.
 * Full license: licenses/physics-rope.txt in the distribution.
 */
/**
 * Adapted from code4fukui/physics-rope, Rope.js (MIT).
 * Copyright (c) 2018 James Wrightson. See PHYSICS-ROPE-LICENSE.
 * Source revision: 0cf6431ebefafa771b56d1bc98ccf1222795cf25.
 * Keeps time-corrected Verlet integration and iterative distance constraints.
 * Adds sampled rest contours, local simulation windows, collisions and sleeping.
 */
import type { YarnBox } from './yarnPath';

export interface RopeVector { x: number; y: number }
export interface RopeNode {
  pos: RopeVector;
  oldPos: RopeVector;
  rest: RopeVector;
  fixed: boolean;
}
interface Drag { index: number; target: RopeVector }
export interface RopeRange { start: number; end: number }
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** The existing layout generator emits just one M followed by cubic curves. */
export function sampleYarnContour(path: string, spacing = 20): RopeVector[] {
  const values = (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  if (values.length < 2) return [];
  const dense: RopeVector[] = [{ x: values[0], y: values[1] }];
  let from = dense[0];
  for (let i = 2; i + 5 < values.length; i += 6) {
    const [ax, ay, bx, by, ex, ey] = values.slice(i, i + 6);
    const length = Math.hypot(ax - from.x, ay - from.y) + Math.hypot(bx - ax, by - ay) + Math.hypot(ex - bx, ey - by);
    const steps = Math.max(4, Math.ceil(length / 10));
    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const u = 1 - t;
      dense.push({
        x: u ** 3 * from.x + 3 * u ** 2 * t * ax + 3 * u * t ** 2 * bx + t ** 3 * ex,
        y: u ** 3 * from.y + 3 * u ** 2 * t * ay + 3 * u * t ** 2 * by + t ** 3 * ey,
      });
    }
    from = { x: ex, y: ey };
  }
  let total = 0;
  for (let i = 1; i < dense.length; i++) total += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y);
  const step = Math.max(8, spacing, total / 1800);
  const result: RopeVector[] = [{ ...dense[0] }];
  let carry = 0;
  for (let i = 1; i < dense.length; i++) {
    let a = dense[i - 1];
    const b = dense[i];
    let distance = Math.hypot(b.x - a.x, b.y - a.y);
    while (distance > 1e-6 && carry + distance >= step) {
      const t = (step - carry) / distance;
      a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      result.push(a);
      distance = Math.hypot(b.x - a.x, b.y - a.y);
      carry = 0;
    }
    carry += distance;
  }
  const last = dense[dense.length - 1];
  if (Math.hypot(last.x - result[result.length - 1].x, last.y - result[result.length - 1].y) > .01) result.push({ ...last });
  return result;
}

export function segmentBlocked(a: RopeVector, b: RopeVector, boxes: readonly YarnBox[], padding = 0) {
  // Conservative bounds protect both the visible fibre and the wider touch target.
  return boxes.some(box => Math.max(a.x, b.x) >= box.left - padding &&
    Math.min(a.x, b.x) <= box.left + box.width + padding &&
    Math.max(a.y, b.y) >= box.top - padding && Math.min(a.y, b.y) <= box.top + box.height + padding);
}

export class YarnPhysics {
  readonly nodes: RopeNode[];
  readonly lengths: number[];
  readonly iterations = 18;
  range: RopeRange;
  private drag: Drag | null = null;
  private previousDt = 1 / 60;
  private width: number;
  private height: number;
  private obstacles: readonly YarnBox[];
  private activeBoxes: readonly YarnBox[];

  constructor(points: readonly RopeVector[], width: number, height: number, obstacles: readonly YarnBox[] = []) {
    this.nodes = points.map((p, i) => ({ pos: { ...p }, oldPos: { ...p }, rest: { ...p }, fixed: i === 0 || i === points.length - 1 }));
    this.lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    this.range = { start: 0, end: points.length - 1 };
    this.width = width;
    this.height = height;
    this.obstacles = obstacles;
    this.activeBoxes = obstacles;
  }

  setWindow(top: number, bottom: number) {
    if (!this.nodes.length) { this.range = { start: 0, end: -1 }; return; }
    const lowerBound = (y: number) => {
      let lo = 0;
      let hi = this.nodes.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (this.nodes[mid].rest.y < y) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    const start = Math.max(0, lowerBound(top - 180) - 2);
    const end = Math.min(this.nodes.length - 1, lowerBound(bottom + 180) + 2);
    if (start === this.range.start && end === this.range.end) return;
    // Frozen offscreen nodes have no accumulated velocity when they re-enter.
    for (let i = this.range.start; i <= this.range.end; i++) this.nodes[i].oldPos = { ...this.nodes[i].pos };
    this.range = { start, end };
    this.activeBoxes = this.obstacles.filter(box => box.top + box.height >= top - 220 && box.top <= bottom + 220);
    this.previousDt = 1 / 60;
  }

  nearest(point: RopeVector, radius: number) {
    let best = -1;
    let distance = radius;
    for (let i = this.range.start + 1; i < this.range.end; i++) {
      if (this.nodes[i].fixed) continue;
      const p = this.nodes[i].pos;
      const d = Math.hypot(point.x - p.x, point.y - p.y);
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  }

  grab(index: number, target: RopeVector) {
    if (index <= this.range.start || index >= this.range.end || this.nodes[index]?.fixed) return false;
    this.drag = { index, target: { ...target } };
    this.move(target);
    return true;
  }

  move(target: RopeVector) {
    if (!this.drag) return;
    const rest = this.nodes[this.drag.index].rest;
    const dx = target.x - rest.x;
    const dy = target.y - rest.y;
    const reach = Math.min(220, this.width * .42);
    const scale = Math.min(1, reach / Math.max(.001, Math.hypot(dx, dy)));
    this.drag.target = { x: clamp(rest.x + dx * scale, 2, this.width - 2), y: clamp(rest.y + dy * scale, 0, this.height) };
  }

  release() {
    if (this.drag) {
      const p = this.nodes[this.drag.index];
      const dx = p.pos.x - p.oldPos.x;
      const dy = p.pos.y - p.oldPos.y;
      const scale = Math.min(1, 4 / Math.max(.001, Math.hypot(dx, dy)));
      p.oldPos = { x: p.pos.x - dx * scale, y: p.pos.y - dy * scale };
    }
    this.drag = null;
  }

  resetWindow() {
    this.release();
    for (let i = this.range.start; i <= this.range.end; i++) {
      this.nodes[i].pos = { ...this.nodes[i].rest };
      this.nodes[i].oldPos = { ...this.nodes[i].rest };
    }
  }

  private pinned(i: number) {
    return this.nodes[i].fixed || i === this.range.start || i === this.range.end || i === this.drag?.index;
  }

  private collide(point: RopeNode) {
    point.pos.x = clamp(point.pos.x, 1, this.width - 1);
    point.pos.y = clamp(point.pos.y, 0, this.height);
    for (const box of this.activeBoxes) {
      const left = box.left - 8;
      const right = box.left + box.width + 8;
      const top = box.top - 24;
      const bottom = box.top + box.height + 24;
      if (point.pos.x <= left || point.pos.x >= right || point.pos.y <= top || point.pos.y >= bottom) continue;
      const distances = [point.pos.x - left, right - point.pos.x, point.pos.y - top, bottom - point.pos.y];
      const side = distances.indexOf(Math.min(...distances));
      const oldX = point.pos.x;
      const oldY = point.pos.y;
      if (side === 0) point.pos.x = left;
      else if (side === 1) point.pos.x = right;
      else if (side === 2) point.pos.y = top;
      else point.pos.y = bottom;
      point.oldPos.x += point.pos.x - oldX;
      point.oldPos.y += point.pos.y - oldY;
    }
  }

  step(dt = 1 / 60) {
    if (this.nodes.length < 2) return 0;
    const delta = clamp(dt, 1 / 240, 1 / 30);
    const correction = delta / this.previousDt;
    const damping = Math.pow(.96, delta * 60);
    const { start, end } = this.range;
    for (let i = start + 1; i < end; i++) {
      const point = this.nodes[i];
      if (this.pinned(i)) continue;
      let vx = (point.pos.x - point.oldPos.x) * correction * damping;
      let vy = (point.pos.y - point.oldPos.y) * correction * damping;
      const speed = Math.hypot(vx, vy);
      if (speed > 18) { vx *= 18 / speed; vy *= 18 / speed; }
      point.oldPos = { ...point.pos };
      // Light guides retain the editorial contour; gravity supplies gentle sag.
      point.pos.x += vx + (point.rest.x - point.pos.x) * 7 * delta ** 2;
      point.pos.y += vy + (28 + (point.rest.y - point.pos.y) * 7) * delta ** 2;
    }
    if (this.drag) {
      const p = this.nodes[this.drag.index];
      p.oldPos = { ...p.pos };
      p.pos = { ...this.drag.target };
      this.collide(p);
    }
    // Each edge is visited once, equivalent to the source's two .25 neighbour corrections.
    for (let iteration = 0; iteration < this.iterations; iteration++) {
      for (let j = start; j < end; j++) {
        const i = iteration % 2 ? end - 1 - (j - start) : j;
        const a = this.nodes[i];
        const b = this.nodes[i + 1];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const length = Math.hypot(dx, dy);
        if (length < 1e-7) continue;
        const fixedA = this.pinned(i);
        const fixedB = this.pinned(i + 1);
        const factor = (length - this.lengths[i]) / length;
        const weight = fixedA || fixedB ? 1 : .5;
        if (!fixedA) { a.pos.x += dx * factor * weight; a.pos.y += dy * factor * weight; }
        if (!fixedB) { b.pos.x -= dx * factor * weight; b.pos.y -= dy * factor * weight; }
      }
      for (let i = start + 1; i < end; i++) if (!this.nodes[i].fixed) this.collide(this.nodes[i]);
    }
    let energy = 0;
    for (let i = start + 1; i < end; i++) {
      const p = this.nodes[i];
      energy = Math.max(energy, Math.hypot(p.pos.x - p.oldPos.x, p.pos.y - p.oldPos.y));
    }
    this.previousDt = delta;
    return energy;
  }
}
