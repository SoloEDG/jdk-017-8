import type { CompareLayout, StudioDocument } from "../../../shared/types";
import { clamp } from "../../../shared/math";
/** 进入对照：把当前侧构图复制到另一侧，从“同一画面”开始对比 */
export function enableCompare(doc: StudioDocument) {
  if (doc.compare.enabled) return;
  copySide(doc, doc.active, doc.active === 0 ? 1 : 0);
  doc.compare.enabled = true;
}
export function exitCompare(doc: StudioDocument) {
  doc.compare.enabled = false;
}
export function setActive(doc: StudioDocument, side: 0 | 1) {
  doc.active = side;
}
/** 把一侧的投影与边缘设置整体复制到另一侧 */
export function copySide(doc: StudioDocument, from: 0 | 1, to: 0 | 1) {
  if (from === to) return;
  doc.sides[to].projection = { ...doc.sides[from].projection };
  doc.sides[to].edge = { ...doc.sides[from].edge };
}
export function setLayout(doc: StudioDocument, layout: CompareLayout) {
  doc.compare.layout = layout;
}
export function setSplit(doc: StudioDocument, value: number) {
  doc.compare.split = clamp(value, 0.2, 0.8);
}
export function setLinked(doc: StudioDocument, linked: boolean) {
  doc.compare.linked = linked;
}
