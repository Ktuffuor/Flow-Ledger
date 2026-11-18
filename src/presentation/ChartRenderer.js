import { formatCurrency } from "../domain/entities.js";

const CHART_COLORS = [
  "#2563eb", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#64748b"
];

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class ChartRenderer {
  static renderCategoryDonut(container, { totalExpense, breakdown }, currency) {
    if (!breakdown.length || totalExpense <= 0) {
      container.innerHTML = `<p class="empty-msg">Log an expense this month to view category breakdown.</p>`;
      return;
    }

    const size = 140;
    const stroke = 24;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const circles = breakdown
      .map((item, idx) => {
        const fraction = item.amount / totalExpense;
        const dash = fraction * circumference;
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const el = `<circle r="${radius}" cx="${size / 2}" cy="${size / 2}" fill="transparent"
          stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${dash} ${circumference - dash}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 ${size / 2} ${size / 2})">
          <title>${escapeHtml(item.category)}: ${formatCurrency(item.amount, currency)} (${item.percentage.toFixed(1)}%)</title>
        </circle>`;
        offset += dash;
        return el;
      })
      .join("");

    const legend = breakdown
      .slice(0, 6)
      .map((item, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        return `
          <div class="legend-row">
            <span><span class="legend-dot" style="background:${color};"></span>${escapeHtml(item.category)}</span>
            <strong>${item.percentage.toFixed(0)}%</strong>
          </div>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="donut-wrap">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${circles}</svg>
        <div class="legend-list">${legend}</div>
      </div>
    `;
  }

  static renderDailyBars(container, { daysInMonth, daily, maxDaily }, currency) {
    if (maxDaily <= 0) {
      container.innerHTML = `<p class="empty-msg">No daily expense data for this month yet.</p>`;
      return;
    }

    const w = 320;
    const h = 140;
    const barW = w / daysInMonth;

    const bars = daily
      .map((val, idx) => {
        const barH = (val / maxDaily) * (h - 20);
        const x = idx * barW + 1;
        const y = h - 16 - barH;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, barW - 2).toFixed(1)}" height="${Math.max(2, barH).toFixed(1)}" rx="2" fill="var(--primary)">
          <title>Day ${idx + 1}: ${formatCurrency(val, currency)}</title>
        </rect>`;
      })
      .join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:140px; display:block;">
        ${bars}
        <text x="2" y="${h - 2}" font-size="10" fill="var(--text-muted)">Day 1</text>
        <text x="${w - 36}" y="${h - 2}" font-size="10" fill="var(--text-muted)">Day ${daysInMonth}</text>
      </svg>
    `;
  }
}