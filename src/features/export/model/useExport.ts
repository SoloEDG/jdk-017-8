import { ref } from "vue";
import type {
  StudioDocument,
  ExportSettings,
  RenderSnapshot,
} from "../../../shared/types";
import { encodeImage, encodePair } from "../lib/encode";
/** single = 当前活动侧；left / right = 分别导出某一侧；pair = 成对并排导出 */
export type ExportTarget = "single" | "left" | "right" | "pair";
export function useExport(doc: StudioDocument) {
  const busy = ref(false),
    progress = ref(0),
    message = ref("");
  let controller: AbortController | null = null;
  async function download(
    settings: ExportSettings,
    target: ExportTarget = "single",
  ) {
    if (!doc.asset || busy.value) return;
    busy.value = true;
    progress.value = 0;
    message.value = "";
    controller = new AbortController();
    const options = { ...settings };
    // 点击瞬间对两侧分别做快照；慢任务（分条渲染 + 编码）期间继续取景
    // 也不会污染本次导出，任务返回时更不会回写到文档。
    const snap = (side: 0 | 1): RenderSnapshot => ({
      asset: doc.asset!,
      projection: { ...doc.sides[side].projection },
      edge: { ...doc.sides[side].edge },
    });
    const pair = target === "pair";
    const side: 0 | 1 =
      target === "right" ? 1 : target === "single" ? doc.active : 0;
    const snapshots: [RenderSnapshot, RenderSnapshot?] = pair
      ? [snap(0), snap(1)]
      : [snap(side)];
    try {
      const blob = pair
        ? await encodePair(
            snapshots[0],
            snapshots[1]!,
            options,
            controller.signal,
            (n) => (progress.value = n),
          )
        : await encodeImage(
            snapshots[0],
            options,
            controller.signal,
            (n) => (progress.value = n),
          );
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = options.format === "png" ? "png" : "jpg";
      a.download = pair
        ? `orbit-pair-${options.size}.${ext}`
        : target === "single"
          ? `orbit-${snapshots[0].projection.mode}-${options.size}.${ext}`
          : `orbit-${target === "left" ? "left" : "right"}-${snapshots[0].projection.mode}-${options.size}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.value = pair
        ? "并排对照图已导出，去下载目录看看吧"
        : "图片已导出，去下载目录看看吧";
    } catch (e) {
      message.value = controller.signal.aborted
        ? "已取消导出"
        : e instanceof Error
          ? e.message
          : "导出失败";
    } finally {
      busy.value = false;
      controller = null;
    }
  }
  return {
    busy,
    progress,
    message,
    download,
    cancel: () => controller?.abort(),
  };
}
