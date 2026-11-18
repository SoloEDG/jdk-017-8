import type { Projection } from "../../../shared/types";
import { clamp, wrap } from "../../../shared/math";
/**
 * 把屏幕像素位移换算成球面朝向增量（单位：度）。
 * 联动同步必须使用这个球面增量，而不是把像素位移当成画面平移——
 * 行星 / 隧道只是同一球面的两种投影方式，球面朝向增量对两者语义一致。
 */
export function dragDelta(dx: number, dy: number, extent: number) {
  return { dyaw: (dx / extent) * 360, dpitch: (dy / extent) * 180 };
}
export function dragView(
  start: Projection,
  dx: number,
  dy: number,
  extent: number,
): Partial<Projection> {
  const { dyaw, dpitch } = dragDelta(dx, dy, extent);
  return {
    yaw: wrap(start.yaw + dyaw, 360),
    pitch: clamp(start.pitch + dpitch, -85, 85),
  };
}
export function wheelZoom(zoom: number, delta: number) {
  return clamp(zoom * Math.exp(-clamp(delta, -150, 150) * 0.002), 0.3, 3);
}
