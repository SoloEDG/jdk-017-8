<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Columns2,
  GitCompare,
  GripVertical,
  Link,
  Unlink,
  MousePointer2,
  Move,
  X,
} from "lucide-vue-next";
import type { Projection, StudioDocument } from "../../../shared/types";
import { clamp, wrap } from "../../../shared/math";
import { dragDelta, wheelZoom } from "../../viewport/lib/gestures";
import { useComparePreview } from "../model/useComparePreview";
import {
  copySide,
  exitCompare,
  setActive,
  setLayout,
  setLinked,
  setSplit,
} from "../model/actions";
const { doc } = defineProps<{ doc: StudioDocument }>();
const canvas = ref<HTMLCanvasElement>();
const wrapEl = ref<HTMLElement>();
const { rendering, difference } = useComparePreview(doc, canvas);
/** 分隔线 / 选中框都是 DOM 覆盖层，不会进入画布，也就不会被导出 */
const dividerStyle = computed(() => ({ left: `${doc.compare.split * 100}%` }));
const frameStyle = computed(() =>
  doc.active === 0
    ? { left: 0, width: `${doc.compare.split * 100}%` }
    : { left: `${doc.compare.split * 100}%`, right: 0 },
);
function sideAt(e: PointerEvent | WheelEvent): 0 | 1 {
  if (doc.compare.layout !== "split" || !wrapEl.value) return doc.active;
  const rect = wrapEl.value.getBoundingClientRect();
  return (e.clientX - rect.left) / rect.width < doc.compare.split ? 0 : 1;
}
let start: {
  x: number;
  y: number;
  side: 0 | 1;
  p: Projection;
  other: Projection | null;
} | null = null;
function down(e: PointerEvent) {
  if (e.button !== 0 || !doc.asset) return;
  const side = sideAt(e);
  setActive(doc, side);
  start = {
    x: e.clientX,
    y: e.clientY,
    side,
    p: { ...doc.sides[side].projection },
    // 联动时在手势起点对另一侧快照，拖动全程以它为基准施加同一球面增量
    other: doc.compare.linked
      ? { ...doc.sides[side === 0 ? 1 : 0].projection }
      : null,
  };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (!start) return;
  const extent = (e.currentTarget as HTMLElement).clientWidth;
  const { dyaw, dpitch } = dragDelta(
    e.clientX - start.x,
    e.clientY - start.y,
    extent,
  );
  const self = doc.sides[start.side].projection;
  self.yaw = wrap(start.p.yaw + dyaw, 360);
  self.pitch = clamp(start.p.pitch + dpitch, -85, 85);
  if (start.other) {
    // 联动 = 两侧球面保持相对朝向：把同一个球面朝向增量施加到另一侧。
    // 行星 / 隧道只是投影方式不同，增量在球面语义下对两者一致，
    // 因此切换模式不会造成“屏幕像素平移”式的误同步。
    const other = doc.sides[start.side === 0 ? 1 : 0].projection;
    other.yaw = wrap(start.other.yaw + dyaw, 360);
    other.pitch = clamp(start.other.pitch + dpitch, -85, 85);
  }
}
function wheel(e: WheelEvent) {
  if (!doc.asset) return;
  const side = sideAt(e);
  const self = doc.sides[side].projection;
  const before = self.zoom;
  const next = wheelZoom(before, e.deltaY);
  self.zoom = next;
  if (doc.compare.linked && next !== before) {
    // 缩放联动按比例施加，保持两侧相对尺度
    const other = doc.sides[side === 0 ? 1 : 0].projection;
    other.zoom = clamp(other.zoom * (next / before), 0.3, 3);
  }
}
let dividerRect: DOMRect | null = null;
function dividerDown(e: PointerEvent) {
  if (e.button !== 0 || !wrapEl.value) return;
  dividerRect = wrapEl.value.getBoundingClientRect();
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function dividerMove(e: PointerEvent) {
  if (!dividerRect) return;
  setSplit(doc, (e.clientX - dividerRect.left) / dividerRect.width);
}
</script>
<template>
  <main class="viewport">
    <div class="viewport-heading">
      <div>
        <span class="eyebrow">COMPARE WORKSPACE</span>
        <h1>同一世界，两种宇宙。</h1>
      </div>
      <span class="live"
        ><i />{{
          rendering
            ? "正在渲染"
            : doc.compare.linked
              ? "对照中 · 联动"
              : "对照中 · 独立"
        }}</span
      >
    </div>
    <div class="canvas-area">
      <span class="corner-label"
        >{{
          doc.compare.layout === "split" ? "SIDE BY SIDE" : "DIFF OVERLAY"
        }}
        / 02</span
      >
      <div
        ref="wrapEl"
        class="canvas-wrap compare-wrap"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="start = null"
        @pointercancel="start = null"
        @lostpointercapture="start = null"
        @wheel.prevent="wheel"
      >
        <canvas ref="canvas" aria-label="对照预览画布" />
        <div v-if="!doc.asset" class="empty">导入一张照片，开始并排对照</div>
        <template v-if="doc.asset && doc.compare.layout === 'split'">
          <span class="side-tag left" :class="{ active: doc.active === 0 }"
            >左侧 · A</span
          >
          <span class="side-tag right" :class="{ active: doc.active === 1 }"
            >右侧 · B</span
          >
          <div class="select-frame" :style="frameStyle" />
          <div
            class="divider"
            :style="dividerStyle"
            role="separator"
            aria-label="拖动调整对照分隔线"
            :aria-valuenow="Math.round(doc.compare.split * 100)"
            @pointerdown.stop="dividerDown"
            @pointermove="dividerMove"
            @pointerup="dividerRect = null"
            @pointercancel="dividerRect = null"
            @lostpointercapture="dividerRect = null"
          >
            <span class="divider-handle"><GripVertical :size="13" /></span>
          </div>
        </template>
        <span
          v-if="doc.asset && doc.compare.layout === 'diff'"
          class="diff-badge"
          >差异叠加 · 统一透明基准</span
        >
      </div>
      <div class="canvas-caption">
        <span>STEREOGRAPHIC × 2</span
        ><span v-if="doc.compare.layout === 'diff' && difference !== null">
          平均差异度 {{ (difference * 100).toFixed(1) }}%</span
        ><span v-else>600 × 600 · 对照预览</span>
      </div>
    </div>
    <div class="viewport-toolbar compare-toolbar">
      <div class="gesture-hint">
        <MousePointer2 :size="14" /> 拖动旋转 <span>·</span
        ><Move :size="14" /> 滚轮缩放 <span>·</span> 点击一侧设为活动侧
      </div>
      <div class="tool-buttons">
        <button
          aria-label="并排对照"
          title="并排对照"
          :class="{ selected: doc.compare.layout === 'split' }"
          @click="setLayout(doc, 'split')"
        >
          <Columns2 :size="16" /></button
        ><button
          aria-label="差异叠加"
          title="差异叠加"
          :class="{ selected: doc.compare.layout === 'diff' }"
          @click="setLayout(doc, 'diff')"
        >
          <GitCompare :size="16" /></button
        ><b /><button
          :aria-label="doc.compare.linked ? '关闭联动' : '开启联动'"
          :title="doc.compare.linked ? '关闭联动' : '开启联动'"
          :class="{ selected: doc.compare.linked }"
          @click="setLinked(doc, !doc.compare.linked)"
        >
          <Link v-if="doc.compare.linked" :size="16" /><Unlink
            v-else
            :size="16"
          /></button
        ><b /><button
          class="copy-button"
          title="把左侧设置复制到右侧"
          @click="copySide(doc, 0, 1)"
        >
          A→B</button
        ><button
          class="copy-button"
          title="把右侧设置复制到左侧"
          @click="copySide(doc, 1, 0)"
        >
          B→A</button
        ><b /><button aria-label="退出对照" title="退出对照" @click="exitCompare(doc)">
          <X :size="16" />
        </button>
      </div>
    </div>
    <div class="compare-status">
      <span
        >活动侧：<strong>{{ doc.active === 0 ? "左侧 A" : "右侧 B" }}</strong
        >，侧栏控件跟随该侧</span
      >
      <span>{{
        doc.compare.linked
          ? "联动开启 · 拖动保持两侧球面相对朝向"
          : "联动关闭 · 两侧独立探索"
      }}</span>
      <span>差异叠加在统一透明背景基准下计算，仅用于对比，不影响导出</span>
    </div>
  </main>
</template>
