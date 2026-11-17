import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  BACEN_SERIES, brDate, isBacenIndicator, isBacenPeriod,
} from "../../lib/shared/bacen.js";
import type { BacenIndicator, BacenPeriod } from "../../lib/shared/bacen.js";
import { readObservations, type Observation } from "./series.js";
import { drawChart } from "./chart.js";

type Query = { indicador: BacenIndicator; periodo_dias?: BacenPeriod };
type Series = { indicator: BacenIndicator; rows: Observation[]; fetchedAt?: Date };

const app = new App({ name: "Indicadores do Banco Central", version: "1.0.0" });
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const indicator = el<HTMLSelectElement>("indicator");
const period = el<HTMLSelectElement>("period");
const plot = el<HTMLCanvasElement>("plot");
const observations = el("observations");
const status = el("status");
const retry = el<HTMLButtonElement>("retry");
const source = el<HTMLButtonElement>("source");
const tbody = document.querySelector("tbody")!;
const timestamp = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
});
const month = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", year: "numeric", month: "short" });
let current: Series | undefined;
let initial: Query | undefined;
let userChanged = false;
let requestId = 0;

for (const [value, series] of Object.entries(BACEN_SERIES)) {
  indicator.add(new Option(series.label, value));
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dateLabel(date: string, key: BacenIndicator) {
  return key === "ipca" ? month.format(new Date(date)) : brDate(date);
}

function valueLabel(value: number, key: BacenIndicator) {
  const digits = BACEN_SERIES[key].digits;
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function draw() {
  if (!current) return;
  const { indicator: key, rows } = current;
  drawChart(plot, rows, (value) => valueLabel(value, key),
    (date) => dateLabel(date, key), BACEN_SERIES[key].digits);
}

new ResizeObserver(draw).observe(plot);

function hide(message: string, canRetry = false) {
  status.textContent = message;
  retry.hidden = !canRetry;
  observations.hidden = true;
  current = undefined;
}

function render(series: Series) {
  const { indicator: key, rows, fetchedAt } = series;
  const meta = BACEN_SERIES[key];
  if (!rows.length) {
    hide("Nenhuma observação publicada no período.");
    return;
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  const firstDate = dateLabel(first.date, key);
  const lastDate = dateLabel(last.date, key);

  current = series;
  observations.hidden = false;
  status.textContent = "";
  retry.hidden = true;
  el("series-title").textContent = meta.label;
  el("latest").textContent = valueLabel(last.value, key);
  el("unit").textContent = meta.unit;
  el("reference").textContent = "Última referência · " + lastDate;
  el("frequency").textContent = "Frequência " + meta.frequency.toLocaleLowerCase("pt-BR");
  const rangeLabel = rows.length === 1
    ? "1 observação · " + lastDate
    : rows.length + " observações · " + firstDate + " a " + lastDate;
  el("caption").textContent = key === "ipca" && period.value !== "initial"
    ? rangeLabel + " · O SGS pode incluir meses parcialmente cobertos pelo período."
    : rangeLabel;
  plot.setAttribute("aria-label", meta.label + " em " + meta.unit + ", de " + firstDate + " a " + lastDate);

  el("table-unit").textContent = "Valor (" + meta.unit + ")";
  tbody.replaceChildren(...rows.slice().reverse().map((row) => {
    const element = document.createElement("tr");
    const date = document.createElement("td");
    date.textContent = dateLabel(row.date, key);
    const value = document.createElement("td");
    value.textContent = valueLabel(row.value, key);
    element.append(date, value);
    return element;
  }));
  source.textContent = "Banco Central do Brasil · SGS " + meta.id + " ↗";
  el("source-fallback").hidden = true;
  el("retrieved").textContent = fetchedAt ? "Consulta em " + timestamp.format(fetchedAt) : "";
  draw();
}

function readResponse(result: CallToolResult, query?: Query) {
  if (result.isError) throw new Error("SGS tool returned an error");
  let payload: unknown = result.structuredContent;
  if (!payload) {
    const text = result.content.find((item) => item.type === "text");
    if (text?.type === "text") payload = JSON.parse(text.text);
  }
  if (!object(payload) || !isBacenIndicator(payload.indicador)
      || payload.serie_id !== BACEN_SERIES[payload.indicador].id
      || (query && (payload.indicador !== query.indicador || payload.periodo_dias !== query.periodo_dias))) {
    throw new Error("Unexpected series");
  }
  const rows = readObservations(payload.results);
  const rawCount = Array.isArray(payload.results) ? payload.results.length : 0;
  const fetchedAt = object(payload.provenance) && typeof payload.provenance.fetchedAt === "string"
    ? Date.parse(payload.provenance.fetchedAt) : NaN;
  return {
    indicator: payload.indicador, rows, rawCount,
    period: isBacenPeriod(payload.periodo_dias) ? payload.periodo_dias : undefined,
    fetchedAt: Number.isFinite(fetchedAt) ? new Date(fetchedAt) : undefined,
  };
}

async function load() {
  const key = indicator.value;
  if (!isBacenIndicator(key)) return;
  const chosen = Number(period.value);
  const days = isBacenPeriod(chosen) ? chosen : key === "ipca" ? 365 : 90;
  period.value = String(days);
  const query = { indicador: key, periodo_dias: days };
  const id = ++requestId;
  hide("Consultando " + BACEN_SERIES[key].label + "…");
  try {
    const result = await app.callServerTool({ name: "bacen_taxas", arguments: query }, { timeout: 15_000 });
    if (id === requestId) render(readResponse(result, query));
  } catch {
    if (id === requestId) hide("Não foi possível consultar o Banco Central.", true);
  }
}

function changeSeries() {
  userChanged = true;
  void load();
}

indicator.addEventListener("change", changeSeries);
period.addEventListener("change", changeSeries);
retry.addEventListener("click", changeSeries);

source.addEventListener("click", async () => {
  const selected = current;
  if (!selected) return;
  const id = BACEN_SERIES[selected.indicator].id;
  const url = "https://www3.bcb.gov.br/sgspub/consultarmetadados/consultarMetadadosSeries.do"
    + "?method=consultarMetadadosSeriesInternet&hdOidSerieSelecionada=" + id;
  try {
    if (!(await app.openLink({ url })).isError) return;
  } catch {
    // A host can decline link opening.
  }
  if (selected === current) {
    const fallback = el("source-fallback");
    fallback.textContent = url;
    fallback.hidden = false;
  }
});

app.ontoolinput = ({ arguments: args }) => {
  if (userChanged || !isBacenIndicator(args.indicador)) return;
  initial = {
    indicador: args.indicador,
    ...(isBacenPeriod(args.periodo_dias) ? { periodo_dias: args.periodo_dias } : {}),
  };
  indicator.value = initial.indicador;
  period.value = initial.periodo_dias === undefined ? "initial" : String(initial.periodo_dias);
};
app.ontoolresult = (result) => {
  if (userChanged) return;
  try {
    const series = readResponse(result, initial);
    indicator.value = series.indicator;
    period.value = series.period === undefined ? "initial" : String(series.period);
    if (series.period === undefined && !series.rows.length && series.rawCount) {
      changeSeries();
    } else {
      render(series);
    }
  } catch {
    hide("Não foi possível consultar o Banco Central.", true);
  }
};
app.ontoolcancelled = () => {
  if (!userChanged) hide("Consulta cancelada.", true);
};
app.onhostcontextchanged = ({ theme }) => {
  if (theme) applyDocumentTheme(theme);
  draw();
};

app.connect().then(() => {
  const theme = app.getHostContext()?.theme;
  if (theme) applyDocumentTheme(theme);
  indicator.disabled = false;
  period.disabled = false;
  if (!current && !requestId && status.textContent === "Conectando ao servidor…") {
    status.textContent = "Selecione um indicador ou período.";
  }
  draw();
}).catch(() => hide("A conexão com o host falhou. Abra o painel novamente na conversa."));
