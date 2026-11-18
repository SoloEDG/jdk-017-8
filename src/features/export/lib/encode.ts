import type { ExportSettings, RenderSnapshot } from "../../../shared/types";
import { renderRows } from "../../projection";
function baseline(snapshot: RenderSnapshot, settings: ExportSettings) {
  return {
    ...snapshot,
    edge: {
      ...snapshot.edge,
      transparent: settings.format === "png" && snapshot.edge.transparent,
    },
  };
}
// Use strips to bound working memory and let cancellation interrupt between strips.
async function renderSnapshotCanvas(
  snapshot: RenderSnapshot,
  settings: ExportSettings,
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = settings.size;
  const ctx = canvas.getContext("2d")!;
  const s = baseline(snapshot, settings);
  for (let y = 0; y < settings.size; y += 24) {
    signal.throwIfAborted();
    const end = Math.min(y + 24, settings.size);
    const image = ctx.createImageData(settings.size, end - y);
    renderRows(s, image, y, end, y, settings.size);
    ctx.putImageData(image, 0, y);
    progress(end / settings.size);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return canvas;
}
function toBlob(canvas: HTMLCanvasElement, settings: ExportSettings) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("图片编码失败"))),
      settings.format === "png" ? "image/png" : "image/jpeg",
      settings.quality,
    ),
  );
}
export async function encodeImage(
  snapshot: RenderSnapshot,
  settings: ExportSettings,
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  const canvas = await renderSnapshotCanvas(
    snapshot,
    settings,
    signal,
    progress,
  );
  signal.throwIfAborted();
  return toBlob(canvas, settings);
}
/**
 * 成对导出：左右两侧各自的快照重新离屏渲染后并排拼接。
 * 分隔线与选中框只是界面 DOM，从不参与渲染，因此不会出现在图片里。
 */
export async function encodePair(
  left: RenderSnapshot,
  right: RenderSnapshot,
  settings: ExportSettings,
  signal: AbortSignal,
  progress: (n: number) => void,
) {
  const a = await renderSnapshotCanvas(left, settings, signal, (n) =>
    progress(n / 2),
  );
  const b = await renderSnapshotCanvas(right, settings, signal, (n) =>
    progress(0.5 + n / 2),
  );
  signal.throwIfAborted();
  const canvas = document.createElement("canvas");
  canvas.width = settings.size * 2;
  canvas.height = settings.size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(a, 0, 0);
  ctx.drawImage(b, settings.size, 0);
  return toBlob(canvas, settings);
}
