import type { Rect } from './types';

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function unionRect(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const r of rects) {
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, rotation: 0 };
}

export function rectsEqual(a: Rect, b: Rect) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
