/**
 * 逐像素差异叠加图。
 * 输入两侧必须是在同一基准下渲染的结果（相同尺寸、统一透明背景），
 * 比较使用预乘 alpha 后的颜色，避免一侧的底色设置制造假差异。
 * 返回 0~1 的平均差异度，并把热力图写入 out（完全相同处保持透明，
 * 让棋盘格透出来；差异越大越红）。
 */
export function diffImages(
  a: ImageData,
  b: ImageData,
  out: ImageData,
  gain = 3,
): number {
  const data = a.data;
  const other = b.data;
  const result = out.data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const aa = data[i + 3] / 255;
    const ba = other[i + 3] / 255;
    const mag =
      (Math.abs(data[i] * aa - other[i] * ba) +
        Math.abs(data[i + 1] * aa - other[i + 1] * ba) +
        Math.abs(data[i + 2] * aa - other[i + 2] * ba)) /
      (3 * 255);
    sum += mag;
    const t = Math.min(1, mag * gain);
    result[i] = 235 - 21 * t;
    result[i + 1] = 170 - 101 * t;
    result[i + 2] = 60 - 9 * t;
    result[i + 3] = Math.round(t * 255);
  }
  return sum / (data.length / 4);
}
