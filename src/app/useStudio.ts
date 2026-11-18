import { reactive } from "vue";
import type { Asset, SideDocument, StudioDocument } from "../shared/types";
import { defaultCompare, defaultEdge, defaultProjection } from "../shared/defaults";
export function useStudio(): StudioDocument {
  const state = reactive({
    asset: null as Asset | null,
    // 两侧参数各自独立存放，素材（asset）全局共享一份
    sides: [
      { projection: defaultProjection(), edge: defaultEdge() },
      { projection: defaultProjection(), edge: defaultEdge() },
    ] as [SideDocument, SideDocument],
    active: 0 as 0 | 1,
    compare: defaultCompare(),
    // 访问器：所有控件始终读写“活动侧”。
    // 快速切换 active 后，doc.projection / doc.edge 立即指向正确一侧，
    // 面板无需各自缓存引用，也就不会把参数写进过期的一侧。
    get projection() {
      return this.sides[this.active].projection;
    },
    get edge() {
      return this.sides[this.active].edge;
    },
  });
  return state;
}
