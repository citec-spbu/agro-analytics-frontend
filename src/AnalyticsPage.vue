<template>
  <div class="analytics-root">
    <div v-if="!authorization" class="analytics-banner">
      Войдите в приложение, чтобы загрузить аналитику.
    </div>
    <template v-else>
      <div class="analytics-head">
        <h1 class="analytics-title">Аналитика</h1>
        <p class="analytics-sub">
          Севооборот и земельный фонд: структура культур, календарь план/факт по сезону, урожайность.
        </p>
      </div>

      <div v-if="error" class="analytics-error">{{ error }}</div>

      <div class="analytics-filters">
        <label class="filter-label" for="analytics-season">Сезон (севооборот и графики)</label>
        <select
          id="analytics-season"
          v-model="selectedSeasonId"
          class="season-select"
          @change="loadAll"
        >
          <option value="">Все сезоны</option>
          <option v-for="s in seasonItems" :key="s.season_id" :value="s.season_id">
            {{ s.season_name || s.season_id }}
          </option>
        </select>
        <p class="filter-hint">
          «Все сезоны»: поля, контуры и площадь — из справочника организации. Выбранный сезон: те же три показателя
          — по севообороту за сезон; графики и таблица — с фильтром.
        </p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card kpi-card--land">
          <div class="kpi-label">Поля</div>
          <div class="kpi-value">{{ summary?.fields ?? '—' }}</div>
        </div>
        <div class="kpi-card kpi-card--land">
          <div class="kpi-label">Контуры (всего)</div>
          <div class="kpi-value">{{ summary?.contours_total ?? '—' }}</div>
        </div>
        <div class="kpi-card kpi-card--land">
          <div class="kpi-label">Площадь полей, га</div>
          <div class="kpi-value">{{ areaFmt }}</div>
        </div>
        <div class="kpi-card kpi-card--crop">
          <div class="kpi-label">Записей севооборота</div>
          <div class="kpi-value">{{ summary?.crop_rotation_records ?? '—' }}</div>
        </div>
        <div class="kpi-card kpi-card--crop">
          <div class="kpi-label">Культур (уник.)</div>
          <div class="kpi-value">{{ summary?.crop_rotation_cultures_distinct ?? '—' }}</div>
        </div>
        <div class="kpi-card kpi-card--crop">
          <div class="kpi-label">Площадь в севообороте, га</div>
          <div class="kpi-value">{{ cropAreaFmt }}</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card chart-doughnut">
          <h2 class="chart-title">Структура площади по культурам</h2>
          <p class="chart-hint">Доля гектаров в разрезе культур</p>
          <div class="chart-canvas-wrap">
            <canvas ref="doughnutAreaRef" height="240"></canvas>
          </div>
        </div>
        <div class="chart-card chart-sowings">
          <h2 class="chart-title">Посевы по культурам</h2>
          <p class="chart-hint">
            За последние 36 месяцев: учётные посевы по контурам. Горизонтальные столбцы; если культур больше
            {{ maxSowingsOnChart }}, на графике — топ-{{ maxSowingsOnChart }} по посевам, остальные в «Прочие».
            Полный список — в таблице ниже.
          </p>
          <p v-if="sowingsChartNote" class="chart-note">{{ sowingsChartNote }}</p>
          <div class="chart-canvas-wrap chart-canvas-wrap--sowings">
            <canvas ref="barStartsRef"></canvas>
          </div>
        </div>
        <div class="chart-card chart-wide season-chart-card">
          <h2 class="chart-title">Сезон: план, факт и урожай</h2>
          <p class="chart-hint">
            Полоса: начало → окончание (или до сегодня). Пузырьки — урожайность т/га на дате окончания. Строки
            снизу вверх по началу (до {{ recordsLimit }} записей за запрос; при большом объёме выберите сезон). Ось —
            не раньше 2000 г.
          </p>
          <p v-if="ganttCappedHint" class="chart-hint chart-hint--warn">{{ ganttCappedHint }}</p>
          <div class="season-canvas-wrap">
            <canvas ref="seasonGanttRef"></canvas>
          </div>
        </div>
        <div class="chart-card chart-wide crop-table-card">
          <h2 class="chart-title">Детализация: поле, сезон, контур, культура, даты, урожай</h2>
          <table class="crop-table">
            <thead>
              <tr>
                <th>Поле</th>
                <th>Сезон</th>
                <th>Контур</th>
                <th>Культура</th>
                <th>Сорт</th>
                <th>Начало</th>
                <th>Окончание</th>
                <th class="num">Га</th>
                <th class="num">Урожай, т/га</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in cropRecords" :key="idx">
                <td>{{ row.field_name || '—' }}</td>
                <td>{{ row.season_name || '—' }}</td>
                <td>{{ row.contour_name || '—' }}</td>
                <td>{{ row.culture || '—' }}</td>
                <td>{{ row.cultivar || '—' }}</td>
                <td>{{ row.start_date || '—' }}</td>
                <td>{{ row.end_date || '—' }}</td>
                <td class="num">{{ haFmt(row.contour_area_ha) }}</td>
                <td class="num">{{ yieldFmt(row.harvest_yield_t_per_ha) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import {
  Chart,
  ArcElement,
  PointElement,
  BarElement,
  BarController,
  BubbleController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  ArcElement,
  PointElement,
  BarElement,
  BarController,
  BubbleController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

const SLICE_COLORS = [
  '#2e7d32',
  '#1565c0',
  '#ef6c00',
  '#6a1b9a',
  '#00897b',
  '#c2185b',
  '#5d4037',
  '#3949ab',
  '#558b2f',
  '#0277bd',
];

function sliceColors(n) {
  return Array.from({ length: n }, (_, i) => SLICE_COLORS[i % SLICE_COLORS.length]);
}

function cultureColorHex(culture) {
  const s = String(culture || '—');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return SLICE_COLORS[Math.abs(h) % SLICE_COLORS.length];
}

function cultureBarColor(culture) {
  return `${cultureColorHex(culture)}aa`;
}

const props = defineProps({
  apiBase: { type: String, default: '' },
  authorization: { type: String, default: '' },
});

const effectiveApiBase = computed(() => {
  const b = (props.apiBase || '').replace(/\/$/, '');
  if (b) return b;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
});

const summary = ref(null);
const error = ref('');
const cropRecords = ref([]);
const byCultureItems = ref([]);
const timelineSeries = ref([]);
const seasonItems = ref([]);
const selectedSeasonId = ref('');

const doughnutAreaRef = ref(null);
const barStartsRef = ref(null);
const seasonGanttRef = ref(null);
const sowingsChartNote = ref('');

let chartDoughnutArea;
let chartBarStarts;
let chartSeasonGantt;

const RECORDS_LIMIT = 2000;
const MAX_SOWINGS_ON_CHART = 20;
const maxSowingsOnChart = MAX_SOWINGS_ON_CHART;
const SEASON_GANTT_X_MIN_MS = Date.UTC(2000, 0, 1);

const recordsLimit = RECORDS_LIMIT;

const ganttCappedHint = computed(() => {
  const n = cropRecords.value.filter((r) => r.start_date).length;
  if (n >= RECORDS_LIMIT) {
    return `Отображено до ${RECORDS_LIMIT} записей. Если нужен полный список — выберите конкретный сезон.`;
  }
  return '';
});

const areaFmt = computed(() => {
  const v = summary.value?.area_ha_total;
  if (v == null) return '—';
  return v.toFixed(1);
});

const cropAreaFmt = computed(() => {
  const v = summary.value?.crop_rotation_area_ha_sum;
  if (v == null) return '—';
  return v.toFixed(1);
});

function haFmt(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v).toFixed(2);
}

function yieldFmt(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return Number(v).toFixed(2);
}

function toTime(iso) {
  if (!iso) return Date.now();
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

function endTime(r) {
  if (r.end_date) return toTime(r.end_date);
  return Date.now();
}

function aggregateStartsByCulture(series) {
  const totals = {};
  for (const s of series) {
    const c = s.culture || '—';
    totals[c] = (totals[c] || 0) + (Number(s.count) || 0);
  }
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
}

function sowingsCountWord(n) {
  const k = Math.abs(Math.trunc(Number(n))) % 100;
  const k1 = k % 10;
  if (k > 10 && k < 20) return 'посевов';
  if (k1 > 1 && k1 < 5) return 'посева';
  if (k1 === 1) return 'посев';
  return 'посевов';
}

function truncateCultureAxisLabel(s, maxLen = 34) {
  const t = String(s);
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function buildSowingsBarDisplay(pairs) {
  const max = MAX_SOWINGS_ON_CHART;
  if (pairs.length <= max) {
    return { displayPairs: [...pairs], note: '', mergedCultureCount: 0 };
  }
  const top = pairs.slice(0, max);
  const tail = pairs.slice(max);
  const tailSum = tail.reduce((s, [, n]) => s + (Number(n) || 0), 0);
  const nTail = tail.length;
  const mergedLabel = `Прочие (${nTail} культ.)`;
  return {
    displayPairs: [...top, [mergedLabel, tailSum]],
    note: `Всего ${pairs.length} культур: на графике — ${max} с наибольшим числом посевов, ещё ${nTail} в «${mergedLabel}».`,
    mergedCultureCount: nTail,
  };
}

function sowingsBarColors(labels) {
  return labels.map((lb) => {
    if (String(lb).startsWith('Прочие')) return 'rgba(96, 108, 120, 0.5)';
    return `${cultureColorHex(lb)}cc`;
  });
}

function sowingsBarBorders(labels) {
  return labels.map((lb) => {
    if (String(lb).startsWith('Прочие')) return 'rgba(70, 80, 90, 0.85)';
    return `${cultureColorHex(lb)}ee`;
  });
}

function authHeaders() {
  return props.authorization ? { Authorization: props.authorization } : {};
}

function apiUrl(path) {
  let p = path.startsWith('/') ? path : `/${path}`;
  p = p.replace(/\/{2,}/g, '/');
  const base = (effectiveApiBase.value || '').replace(/\/$/, '');
  return base ? `${base}${p}` : p;
}

function seasonQuery(extraParams = {}) {
  const sp = new URLSearchParams();
  Object.entries(extraParams).forEach(([k, v]) => {
    if (v != null && v !== '') sp.set(k, String(v));
  });
  if (selectedSeasonId.value) sp.set('season_id', selectedSeasonId.value);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function renderDoughnutArea(items) {
  if (!doughnutAreaRef.value) return;
  if (chartDoughnutArea) chartDoughnutArea.destroy();
  if (!items?.length) return;
  const labels = items.map((i) => i.culture || '—');
  const data = items.map((i) => Number(i.area_ha) || 0);
  const colors = sliceColors(labels.length);
  chartDoughnutArea = new Chart(doughnutAreaRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.map((c) => `${c}cc`),
          borderColor: colors.map((c) => `${c}ff`),
          borderWidth: 1,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.raw || 0;
              const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = sum ? ((v / sum) * 100).toFixed(1) : '0';
              return `${ctx.label}: ${v.toFixed(1)} га (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function renderBarStarts(series) {
  const el = barStartsRef.value;
  if (!el) return;
  if (chartBarStarts) chartBarStarts.destroy();
  const pairs = aggregateStartsByCulture(series);
  if (!pairs.length) {
    sowingsChartNote.value = '';
    return;
  }
  const { displayPairs, note, mergedCultureCount } = buildSowingsBarDisplay(pairs);
  sowingsChartNote.value = note;
  const fullLabels = displayPairs.map(([c]) => c);
  const labels = fullLabels.map((c) => truncateCultureAxisLabel(c));
  const data = displayPairs.map(([, n]) => n);
  const colors = sowingsBarColors(fullLabels);
  const borders = sowingsBarBorders(fullLabels);
  const rowPx = 30;
  el.height = Math.max(180, 56 + displayPairs.length * rowPx);
  chartBarStarts = new Chart(el, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Посевов (по дате начала)',
          data,
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 22,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              const i = items[0].dataIndex;
              return fullLabels[i] || '';
            },
            label(ctx) {
              const v = Number(ctx.raw) || 0;
              const i = ctx.dataIndex;
              if (mergedCultureCount && String(fullLabels[i]).startsWith('Прочие')) {
                return `${v} ${sowingsCountWord(v)} суммарно по ${mergedCultureCount} культурам за 36 мес.`;
              }
              return `${v} ${sowingsCountWord(v)} за 36 мес.`;
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          ticks: { precision: 0 },
          title: { display: true, text: 'Посевов, шт.' },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
        y: {
          reverse: true,
          ticks: { font: { size: 10 } },
          grid: { display: false },
        },
      },
    },
  });
}

function bubbleRadius(tPerHa) {
  const v = Number(tPerHa) || 0;
  return Math.min(22, Math.max(7, 4 + v * 1.8));
}

function renderSeasonGantt(records) {
  const el = seasonGanttRef.value;
  if (!el) return;
  if (chartSeasonGantt) chartSeasonGantt.destroy();
  const rows = [...(records || [])].filter((r) => r.start_date);
  rows.sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  const limited = rows;
  if (!limited.length) return;

  const labels = limited.map((r) => {
    const f = (r.field_name || '—').slice(0, 22);
    const c = (r.contour_name || r.culture || '—').slice(0, 20);
    return `${f} · ${c}`;
  });

  const barBg = limited.map((r) => cultureBarColor(r.culture));
  const pxPerRow = 28;
  el.height = Math.max(200, 48 + limited.length * pxPerRow);

  const bubbleData = [];
  limited.forEach((r, i) => {
    if (r.harvest_yield_t_per_ha == null || Number.isNaN(Number(r.harvest_yield_t_per_ha))) return;
    const yv = Number(r.harvest_yield_t_per_ha);
    bubbleData.push({
      x: toTime(r.end_date || r.start_date),
      y: labels[i],
      r: bubbleRadius(yv),
      yieldVal: yv,
    });
  });

  chartSeasonGantt = new Chart(el, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Период севооборота',
          data: limited.map((r) => [toTime(r.start_date), endTime(r)]),
          backgroundColor: barBg,
          borderWidth: 0,
          borderRadius: 5,
          borderSkipped: false,
          barThickness: 18,
          order: 2,
        },
        {
          type: 'bubble',
          label: 'Урожайность, т/га',
          data: bubbleData,
          backgroundColor: 'rgba(198, 40, 40, 0.45)',
          borderColor: 'rgba(142, 36, 36, 0.95)',
          borderWidth: 1,
          order: 1,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            title(items) {
              const i = items[0].dataIndex;
              const ds = items[0].dataset;
              if (ds.type === 'bubble') {
                const p = items[0].raw;
                return typeof p.y === 'string' ? p.y : labels[p.y] || '';
              }
              return labels[i] || '';
            },
            label(ctx) {
              if (ctx.dataset.type === 'bubble') {
                const p = ctx.raw;
                return `Урожай: ${p.yieldVal} т/га`;
              }
              const r = limited[ctx.dataIndex];
              return [
                `${r.culture || '—'} (${r.season_name || '—'})`,
                `Начало: ${r.start_date}`,
                `Окончание: ${r.end_date || '— (по сегодня)'}`,
                r.harvest_yield_t_per_ha != null
                  ? `Урожай: ${yieldFmt(r.harvest_yield_t_per_ha)} т/га`
                  : 'Урожай: не указан',
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          min: SEASON_GANTT_X_MIN_MS,
          ticks: {
            maxTicksLimit: 10,
            callback(v) {
              return new Date(v).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: '2-digit',
              });
            },
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
          title: { display: true, text: 'Календарь' },
        },
        y: {
          type: 'category',
          offset: true,
          grid: { display: false },
          ticks: { font: { size: 10 } },
        },
      },
    },
  });
}

async function loadSeasonsList() {
  if (!props.authorization || !effectiveApiBase.value) return;
  const h = authHeaders();
  try {
    const { data } = await axios.get(apiUrl('/api/analytics/crops/seasons'), { headers: h });
    seasonItems.value = data.items || [];
    const ids = new Set(seasonItems.value.map((s) => s.season_id));
    if (selectedSeasonId.value && !ids.has(selectedSeasonId.value)) {
      selectedSeasonId.value = '';
    }
  } catch {
    seasonItems.value = [];
  }
}

async function loadAll() {
  error.value = '';
  if (!props.authorization || !effectiveApiBase.value) return;
  const h = authHeaders();
  try {
    const [sum, byCulture, timeline, records] = await Promise.all([
      axios.get(apiUrl(`/api/analytics/summary${seasonQuery()}`), { headers: h }),
      axios.get(apiUrl(`/api/analytics/crops/by-culture${seasonQuery()}`), { headers: h }),
      axios.get(apiUrl(`/api/analytics/crops/timeline-starts${seasonQuery({ months: 36 })}`), {
        headers: h,
      }),
      axios.get(
        apiUrl(`/api/analytics/crops/records${seasonQuery({ limit: RECORDS_LIMIT })}`),
        { headers: h },
      ),
    ]);
    summary.value = sum.data;
    byCultureItems.value = byCulture.data.items || [];
    timelineSeries.value = timeline.data.series || [];
    cropRecords.value = records.data.items || [];
    await nextTick();
    renderDoughnutArea(byCultureItems.value);
    renderBarStarts(timelineSeries.value);
    renderSeasonGantt(cropRecords.value);
  } catch (e) {
    error.value =
      e?.response?.data?.detail ||
      e?.message ||
      'Не удалось загрузить данные аналитики';
  }
}

async function bootstrapAnalytics() {
  await loadSeasonsList();
  await loadAll();
}

onMounted(bootstrapAnalytics);
watch(
  () => [effectiveApiBase.value, props.authorization],
  () => bootstrapAnalytics(),
);

onBeforeUnmount(() => {
  chartDoughnutArea?.destroy();
  chartBarStarts?.destroy();
  chartSeasonGantt?.destroy();
});
</script>

<style scoped>
.analytics-root {
  font-family: system-ui, -apple-system, sans-serif;
  color: #1b2430;
  max-width: 1100px;
  margin: 0 auto;
}

.analytics-filters {
  margin-bottom: 1rem;
}

.analytics-filters .filter-label {
  display: block;
  font-size: 0.75rem;
  color: #6a7b90;
  margin-bottom: 4px;
}

.season-select {
  width: 100%;
  max-width: 420px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cfd8dc;
  font-size: 0.9rem;
  background: #fff;
}

.filter-hint {
  margin: 8px 0 0;
  font-size: 0.72rem;
  color: #78909c;
  line-height: 1.35;
  max-width: 42rem;
}

.analytics-head {
  margin-bottom: 1rem;
}

.analytics-title {
  font-size: 1.5rem;
  margin: 0 0 0.25rem;
  font-weight: 650;
}

.analytics-sub {
  margin: 0;
  color: #5c6b80;
  font-size: 0.9rem;
  line-height: 1.45;
}

.analytics-banner,
.analytics-error {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 12px;
}

.analytics-banner {
  background: #f0f4f8;
  color: #3d4f66;
}

.analytics-error {
  background: #ffebee;
  color: #b71c1c;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 1rem;
}

.kpi-card {
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #e1e8f0;
}

.kpi-card--land {
  background: linear-gradient(145deg, #f3f6f9, #e8eef5);
}

.kpi-card--crop {
  background: linear-gradient(145deg, #f1f8f4, #e3f2e6);
}

.kpi-label {
  font-size: 0.75rem;
  color: #6a7b90;
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1e2a3d;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.chart-card {
  background: #fff;
  border: 1px solid #e4eaf2;
  border-radius: 14px;
  padding: 14px 14px 12px;
  box-shadow: 0 6px 18px rgba(20, 40, 70, 0.05);
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-doughnut .chart-canvas-wrap {
  position: relative;
  height: 260px;
  max-width: 360px;
  margin: 0 auto;
}

.chart-sowings .chart-canvas-wrap--sowings {
  position: relative;
  width: 100%;
  min-height: 180px;
  max-height: min(78vh, 880px);
  overflow-y: auto;
}

.chart-note {
  margin: 0 0 8px;
  font-size: 0.72rem;
  color: #546e7a;
  line-height: 1.4;
}

.season-chart-card .season-canvas-wrap {
  position: relative;
  min-height: 220px;
  max-height: min(70vh, 1200px);
  overflow-y: auto;
  width: 100%;
}

.chart-title {
  font-size: 1rem;
  margin: 0 0 4px;
  font-weight: 600;
}

.chart-hint {
  margin: 0 0 10px;
  font-size: 0.78rem;
  color: #78909c;
  line-height: 1.4;
}

.chart-hint--warn {
  color: #b71c1c;
}

.crop-table-card {
  overflow-x: auto;
}

.crop-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.crop-table th,
.crop-table td {
  border: 1px solid #e4eaf2;
  padding: 6px 8px;
  text-align: left;
}

.crop-table th {
  background: #f5f7fa;
  font-weight: 600;
}

.crop-table .num {
  text-align: right;
}

@media (max-width: 720px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .chart-doughnut .chart-canvas-wrap {
    max-width: none;
  }
}
</style>
