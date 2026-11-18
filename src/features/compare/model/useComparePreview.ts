import { watch, ref, onBeforeUnmount, type Ref } from "vue";
import type { RenderSnapshot, StudioDocument } from "../../../shared/types";
import { renderRows } from "../../projection";
import { diffImages } from "../lib/diff";
const SIZE = 600;
const STRIP = 60;
function makeLayer() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  return {
    canvas,
    ctx: canvas.getContext("2d", { willReadFrequently: true })!,
    key: "",
  };
}
/**
 * 对照预览渲染。
 *
 * 缓存与隔离的取舍：
 * - 素材 ImageData 两侧共享（只读采样，安全）；
 * - 每侧各有一份独立离屏画布作为渲染缓存，参数（含素材 id）未变时直接复用，
 *   拖动分隔线只重新合成、不重复渲染；
 * - 差异叠加使用单独的“基准缓存”（强制透明背景），与预览缓存互不污染；
 * - 任何异步慢任务都带令牌，返回时令牌已过期就放弃提交，
 *   绝不让旧取景覆盖新取景。
 */
export function useComparePreview(
  doc: StudioDocument,
  canvas: Ref<HTMLCanvasElement | undefined>,
) {
  const rendering = ref(false);
  /** 差异叠加模式下的平均差异度（0~1），其余情况为 null */
  const difference = ref<number | null>(null);
  const preview = [makeLayer(), makeLayer()];
  const baseline = [makeLayer(), makeLayer()];
  let token = 0;
  const snapshotOf = (side: 0 | 1, base: boolean): RenderSnapshot => ({
    asset: doc.asset!,
    projection: { ...doc.sides[side].projection },
    edge: base
      ? // 差异比较统一基准：强制透明背景，底色差异不参与比较
        { ...doc.sides[side].edge, transparent: true }
      : { ...doc.sides[side].edge },
  });
  async function renderLayer(
    layer: (typeof preview)[0],
    s: RenderSnapshot,
    t: number,
  ) {
    for (let y = 0; y < SIZE; y += STRIP) {
      if (t !== token) return false;
      const end = Math.min(y + STRIP, SIZE);
      const image = layer.ctx.createImageData(SIZE, end - y);
      renderRows(s, image, y, end, y, SIZE);
      layer.ctx.putImageData(image, 0, y);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return t === token;
  }
  async function renderSide(side: 0 | 1, base: boolean, t: number) {
    const s = snapshotOf(side, base);
    const key = JSON.stringify([s.asset.id, s.projection, s.edge]);
    const layer = (base ? baseline : preview)[side];
    if (layer.key === key) return t === token; // 命中缓存，跳过渲染
    if (await renderLayer(layer, s, t)) {
      layer.key = key;
      return true;
    }
    return false;
  }
  /** 并排布局：按分隔线把两侧缓存合成到可见画布（分隔线本身是 DOM，不进画布） */
  function composite() {
    const target = canvas.value;
    if (!target) return;
    target.width = target.height = SIZE;
    const ctx = target.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (!doc.asset) return;
    const x = Math.round(doc.compare.split * SIZE);
    ctx.drawImage(preview[0].canvas, 0, 0, x, SIZE, 0, 0, x, SIZE);
    ctx.drawImage(preview[1].canvas, x, 0, SIZE - x, SIZE, x, 0, SIZE - x, SIZE);
  }
  async function renderDiff(t: number) {
    if (!(await renderSide(0, true, t))) return;
    if (!(await renderSide(1, true, t))) return;
    const a = baseline[0].ctx.getImageData(0, 0, SIZE, SIZE);
    const b = baseline[1].ctx.getImageData(0, 0, SIZE, SIZE);
    const out = baseline[0].ctx.createImageData(SIZE, SIZE);
    const mean = diffImages(a, b, out);
    const target = canvas.value;
    if (t !== token || !target) return; // 慢任务返回时取景已变，丢弃结果
    target.width = target.height = SIZE;
    target.getContext("2d")!.putImageData(out, 0, 0);
    difference.value = mean;
  }
  async function rerender() {
    const t = ++token;
    rendering.value = true;
    try {
      if (!canvas.value) return;
      if (!doc.asset) {
        difference.value = null;
        composite();
        return;
      }
      if (doc.compare.layout === "split") {
        difference.value = null;
        const results = await Promise.all([
          renderSide(0, false, t),
          renderSide(1, false, t),
        ]);
        if (t !== token || !results.every(Boolean)) return;
        composite();
      } else {
        await renderDiff(t);
      }
    } finally {
      if (t === token) rendering.value = false;
    }
  }
  watch(
    () => [
      canvas.value,
      doc.asset,
      JSON.stringify(doc.sides[0].projection),
      JSON.stringify(doc.sides[0].edge),
      JSON.stringify(doc.sides[1].projection),
      JSON.stringify(doc.sides[1].edge),
      doc.compare.layout,
    ],
    () => void rerender(),
    { immediate: true, flush: "post" },
  );
  // 分隔线拖动只改变合成位置，命中两侧缓存，零重渲染
  watch(
    () => doc.compare.split,
    () => {
      if (doc.compare.layout === "split") composite();
    },
  );
  onBeforeUnmount(() => {
    token++;
  });
  return { rendering, difference };
}
