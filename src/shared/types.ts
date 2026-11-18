export interface Projection {
  mode: "planet" | "tunnel";
  zoom: number;
  yaw: number;
  pitch: number;
  roll: number;
}
export interface Edge {
  seam: number;
  feather: number;
  background: string;
  transparent: boolean;
}
export interface Asset {
  id: string;
  name: string;
  width: number;
  height: number;
  data: ImageData;
  thumbnail: string;
}
/** 对照工作区中某一侧独立持有的参数 */
export interface SideDocument {
  projection: Projection;
  edge: Edge;
}
export type CompareLayout = "split" | "diff";
export interface CompareState {
  enabled: boolean;
  /** 联动：拖动一侧时，另一侧跟随相同的球面朝向增量 */
  linked: boolean;
  /** split = 并排（可拖分隔线），diff = 差异叠加 */
  layout: CompareLayout;
  /** 分隔线位置，0~1 */
  split: number;
}
export interface StudioDocument {
  asset: Asset | null;
  /** 活动侧的投影参数（实现为访问器，随 active 切换指向正确文档） */
  projection: Projection;
  /** 活动侧的边缘参数（实现为访问器，随 active 切换指向正确文档） */
  edge: Edge;
  /** 左右两侧各自独立的投影与边缘参数 */
  sides: [SideDocument, SideDocument];
  /** 当前被侧栏控件编辑的一侧 */
  active: 0 | 1;
  compare: CompareState;
}
export interface ExportSettings {
  size: number;
  format: "png" | "jpeg";
  quality: number;
}
export interface RenderSnapshot {
  asset: Asset;
  projection: Projection;
  edge: Edge;
}
