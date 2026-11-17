import type { Observation } from "./series.js";

export function drawChart(
  canvas: HTMLCanvasElement,
  rows: Observation[],
  formatValue: (value: number) => string,
  formatDate: (date: string) => string,
  precision: number,
) {
  const context = canvas.getContext("2d");
  const { width, height } = canvas.getBoundingClientRect();
  if (!context || !rows.length || width < 100 || height < 80) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);

  const style = getComputedStyle(canvas);
  const muted = style.getPropertyValue("--muted").trim();
  const border = style.getPropertyValue("--border").trim();
  const accent = style.getPropertyValue("--accent").trim();
  const min = Math.min(...rows.map(({ value }) => value));
  const max = Math.max(...rows.map(({ value }) => value));
  const pad = (max - min) * 0.1 || Math.max(Math.abs(max) * 0.05, 10 ** -precision);
  const low = min - pad;
  const high = max + pad;

  context.font = "12px system-ui";
  context.textBaseline = "middle";
  const ticks = Array.from({ length: 4 }, (_, index) => high - index * (high - low) / 3);
  const labelWidth = Math.max(...ticks.map((tick) => context.measureText(formatValue(tick)).width));
  const left = Math.ceil(labelWidth) + 12;
  const right = width - 10;
  const top = 11;
  const bottom = height - 24;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const elapsed = last.time - first.time;
  const x = (time: number) => elapsed ? left + (time - first.time) / elapsed * (right - left) : (left + right) / 2;
  const y = (value: number) => bottom - (value - low) / (high - low) * (bottom - top);

  context.fillStyle = muted;
  for (const tick of ticks) {
    const lineY = y(tick);
    context.strokeStyle = border;
    context.beginPath();
    context.moveTo(left, lineY);
    context.lineTo(right, lineY);
    context.stroke();
    context.fillText(formatValue(tick), 0, lineY);
  }

  context.textAlign = "left";
  context.fillText(formatDate(first.date), left, height - 8);
  if (elapsed) {
    context.textAlign = "right";
    context.fillText(formatDate(last.date), right, height - 8);
  }

  context.strokeStyle = accent;
  context.fillStyle = accent;
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(x(first.time), y(first.value));
  for (const row of rows.slice(1)) context.lineTo(x(row.time), y(row.value));
  context.stroke();
  context.beginPath();
  context.arc(x(last.time), y(last.value), 3.5, 0, 2 * Math.PI);
  context.fill();
}
