export interface YarnBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface YarnLayout {
  width: number;
  height: number;
  gutter: number;
  sections: readonly YarnBox[];
  obstacles: readonly YarnBox[];
  endAnchor?: { x: number; y: number };
}

/**
 * A downward, irregular meander in the available negative space.
 * There are no section-to-section crossbars or mirrored edge switches.
 * Cubic handles share a vertical tangent at every join, with strictly rising y.
 * This path is also sampled for the physical particles and their rest lengths.
 */
export function buildYarnPath({ width, height, gutter, sections, obstacles, endAnchor }: YarnLayout) {
  if (width <= 0 || height <= 0) return '';
  const finish = Math.min(height, Math.max(0, endAnchor?.y ?? height - 12));
  const rows = [0];
  for (let i = 0; rows[rows.length - 1] < finish; i++) {
    const span = 205 + 49 * Math.sin(i * 1.73 + .6) + 31 * Math.sin(i * .61 + 2.1);
    rows.push(Math.min(finish, rows[rows.length - 1] + span));
  }
  if (endAnchor && rows.length > 2 && finish - rows[rows.length - 2] < 160) rows.splice(-2, 1);
  const heroEnd = sections[0]?.top ?? 0;
  const caps = rows.slice(1).map((bottom, i) => {
    const top = rows[i];
    // A whole Bezier control hull must fit the corridor, not just its endpoints.
    let cap = Math.min(width * .3, Math.max(gutter * 1.15, 36));
    for (const box of obstacles) {
      if (box.top + box.height + 32 < top || box.top - 32 > bottom) continue;
      cap = Math.min(cap, box.left - 10);
    }
    if (bottom < heroEnd) cap = Math.min(cap, Math.max(10, gutter * .22));
    return Math.max(6, cap);
  });
  const points = rows.map((y, i) => {
    if (endAnchor && i === rows.length - 1) return { x: Math.max(2, Math.min(width - 2, endAnchor.x)), y };
    const before = caps[Math.max(0, i - 1)] ?? 6;
    const after = caps[Math.min(caps.length - 1, i)] ?? 6;
    const previousSpan = i ? y - rows[i - 1] : rows[1] ?? 1;
    const nextSpan = i < rows.length - 1 ? rows[i + 1] - y : previousSpan;
    // Bound sideways travel relative to vertical distance: never flatten into a bar.
    const reach = Math.max(6, Math.min(before, after, 6 + Math.min(previousSpan, nextSpan) * .48));
    const alternation = i % 2 ? .74 : .12;
    const irregularity = .08 * Math.sin(i * 2.47 + .4) + .035 * Math.sin(i * .79);
    return { x: i === 0 ? 6 : 6 + (reach - 6) * (alternation + irregularity), y };
  });
  const n = (value: number) => value.toFixed(3);
  let path = `M${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = (b.y - a.y) / 3;
    path += ` C${n(a.x)} ${n(a.y + dy)} ${n(b.x)} ${n(b.y - dy)} ${n(b.x)} ${n(b.y)}`;
  }
  return path;
}
