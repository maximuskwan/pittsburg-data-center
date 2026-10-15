// Finds the shift (meters east, meters north) that best lays the canal traced
// from the city's map onto the real canal from OpenStreetMap. Used by the
// "Snap to canal" button in ?calibrate. Both inputs are in local meters:
//   traced: [[e, n], …]           points along the traced canal
//   lines:  [[[e, n], …], …]      OpenStreetMap canal lines
// Iterative closest point, translation only, ignoring far-off matches.
export function snapOffset(traced, lines, { iterations = 30, startRadius = 400, endRadius = 60 } = {}) {
  const segments = lines.flatMap((l) => l.slice(1).map((b, i) => [l[i], b]));
  if (!segments.length || !traced.length) return null;
  const nearest = ([px, py]) => {
    let best = null;
    let bestD = Infinity;
    for (const [[ax, ay], [bx, by]] of segments) {
      const dx = bx - ax, dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      const qx = ax + t * dx, qy = ay + t * dy;
      const d = (qx - px) ** 2 + (qy - py) ** 2;
      if (d < bestD) { bestD = d; best = [qx, qy]; }
    }
    return [best, Math.sqrt(bestD)];
  };
  let sx = 0, sy = 0, used = 0, residual = Infinity;
  for (let k = 0; k < iterations; k++) {
    const radius = startRadius + ((endRadius - startRadius) * k) / (iterations - 1);
    let mx = 0, my = 0, n = 0, err = 0;
    for (const [x, y] of traced) {
      const [q, d] = nearest([x + sx, y + sy]);
      if (d > radius) continue;
      mx += q[0] - (x + sx); my += q[1] - (y + sy); err += d; n++;
    }
    if (!n) break;
    sx += mx / n; sy += my / n; used = n; residual = err / n;
  }
  return used ? { east: sx, north: sy, matched: used, of: traced.length, meanError: residual } : null;
}

// Evenly spaced points along a polyline, every `step` meters.
export function densify(line, step = 15) {
  const out = [];
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let j = 0; j < n; j++) out.push([ax + ((bx - ax) * j) / n, ay + ((by - ay) * j) / n]);
  }
  out.push(line.at(-1));
  return out;
}
