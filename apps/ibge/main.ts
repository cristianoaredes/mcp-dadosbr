import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createGazetteSearch } from "../querido-diario/search.js";

type Query =
  | { tipo: "regioes" | "estados" | "municipios" }
  | { tipo: "municipios_por_uf"; uf: string };
type Locality = {
  id: number;
  nome: string;
  sigla?: string;
  regiao?: { id: number };
};
type Source = { url: string; fetchedAt?: Date };
type Dataset = { items: Locality[]; source?: Source };
type Status = "loading" | "ready" | "error";
type HostContext = NonNullable<ReturnType<App["getHostContext"]>>;

const app = new App({ name: "Localidades do Brasil", version: "1.0.0" });
const gazetteSearch = createGazetteSearch(app, true);
const sourceDocs = "https://servicodados.ibge.gov.br/api/docs/localidades";
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const numberFormat = new Intl.NumberFormat("pt-BR");
const pageSize = 15;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const root = element("explorer");
const region = element<HTMLSelectElement>("region");
const state = element<HTMLSelectElement>("state");
const search = element<HTMLInputElement>("municipality-search");
const results = element("results");
const table = element<HTMLTableElement>("localities");
const tbody = table.tBodies[0];
const previous = element<HTMLButtonElement>("previous-page");
const next = element<HTMLButtonElement>("next-page");
const sourceLink = element<HTMLButtonElement>("source-link");

let regions: Dataset | undefined;
let states: Dataset | undefined;
let cities: Dataset | undefined;
let directoryStatus: Status = "loading";
let cityStatus: Status = "ready";
let selectedRegion = "";
let selectedState = "";
let nationwide = false;
let page = 0;
let activeCityRequest = 0;
let initialQuery: Query | undefined;
let userSelected = false;
let connected = false;
let sourceUrl = sourceDocs;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trustedSource(value: unknown): Source | undefined {
  if (!object(value) || typeof value.url !== "string") return;
  try {
    const url = new URL(value.url);
    if (url.origin !== "https://servicodados.ibge.gov.br" || url.username || url.password
        || !url.pathname.startsWith("/api/v1/localidades/")) return;
    const timestamp = typeof value.fetchedAt === "string" ? Date.parse(value.fetchedAt) : NaN;
    return { url: url.href, fetchedAt: Number.isFinite(timestamp) ? new Date(timestamp) : undefined };
  } catch {
    return;
  }
}

function readDataset(result: CallToolResult): Dataset {
  if (result.isError) throw new Error("IBGE tool returned an error");
  const structured = result.structuredContent;
  let items: unknown = structured?.items;
  if (!Array.isArray(items)) {
    const legacy = result.content.find((part) => part.type === "text");
    if (legacy?.type === "text") items = JSON.parse(legacy.text);
  }
  if (!Array.isArray(items)) throw new Error("Invalid IBGE list");

  const rows: Locality[] = [];
  for (const item of items) {
    if (!object(item) || typeof item.id !== "number" || !Number.isSafeInteger(item.id)
        || typeof item.nome !== "string") continue;
    rows.push({
      id: item.id,
      nome: item.nome,
      sigla: typeof item.sigla === "string" && /^[A-Z]{2}$/.test(item.sigla) ? item.sigla : undefined,
      regiao: object(item.regiao) && typeof item.regiao.id === "number"
        ? { id: item.regiao.id } : undefined,
    });
  }
  if (rows.length !== items.length) throw new Error("Invalid IBGE entries");
  return { items: rows, source: trustedSource(structured?.source) };
}

function queryFromInput(value: unknown): Query | undefined {
  if (!object(value)) return;
  if (value.tipo === "regioes" || value.tipo === "estados" || value.tipo === "municipios") {
    return { tipo: value.tipo };
  }
  if (value.tipo === "municipios_por_uf" && typeof value.uf === "string" && /^[A-Za-z]{2}$/.test(value.uf)) {
    return { tipo: value.tipo, uf: value.uf.toUpperCase() };
  }
}

async function lookup(query: Query): Promise<Dataset> {
  const result = await app.callServerTool({ name: "ibge_localidades", arguments: query }, { timeout: 15_000 });
  return readDataset(result);
}

function option(label: string, value: string): HTMLOptionElement {
  const item = document.createElement("option");
  item.textContent = label;
  item.value = value;
  return item;
}

function visibleStates(): Locality[] {
  return states?.items.filter((row) => !selectedRegion || String(row.regiao?.id) === selectedRegion) ?? [];
}

function renderControls() {
  region.replaceChildren(option("Todas as regiões", ""), ...(regions?.items.map((row) =>
    option(row.nome, String(row.id))) ?? []));
  region.value = selectedRegion;
  region.disabled = !regions;

  const choices = visibleStates().flatMap((row) =>
    row.sigla ? [option(row.nome + " (" + row.sigla + ")", row.sigla)] : []);
  if (selectedState && !choices.some((item) => item.value === selectedState)) {
    choices.push(option(selectedState, selectedState));
  }
  state.replaceChildren(option("Selecione um estado", ""), ...choices);
  state.value = selectedState;
  state.disabled = !states;
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function cell(value: string, className?: string): HTMLTableCellElement {
  const column = document.createElement("td");
  column.textContent = value;
  if (className) column.className = className;
  return column;
}

function localityRow(row: Locality, showCities: boolean): HTMLTableRowElement {
  const line = document.createElement("tr");
  const name = cell(row.nome);

  if (!showCities && row.sigla) {
    const uf = row.sigla;
    const link = document.createElement("button");
    link.type = "button";
    link.className = "row-link";
    link.textContent = row.nome;
    link.addEventListener("click", () => {
      changeState(uf);
      state.focus();
    });
    name.replaceChildren(link);
  }
  line.append(name);
  if (!showCities) line.append(cell(row.sigla ?? "—"));
  line.append(cell(String(row.id), "code"));
  if (showCities) {
    const action = cell("");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "row-link";
    button.textContent = "Ver publicações";
    button.setAttribute("aria-label", "Ver publicações de " + row.nome);
    button.addEventListener("click", () => {
      userSelected = true;
      gazetteSearch.show({ code: String(row.id), name: row.nome }, button);
    });
    action.append(button);
    line.append(action);
  }
  return line;
}

function updateSource(dataset: Dataset | undefined) {
  const source = dataset?.source;
  sourceUrl = source?.url ?? sourceDocs;
  sourceLink.disabled = !connected;
  element("source-status").hidden = true;
  element("source-date").textContent = source?.fetchedAt
    ? "Consultado em " + dateFormat.format(source.fetchedAt)
    : dataset ? "Data da consulta indisponível" : "";
}

function renderResults() {
  const showCities = Boolean(selectedState) || nationwide;
  const dataset = showCities ? cities : states;
  const status = showCities ? cityStatus : directoryStatus;
  const regionName = regions?.items.find((row) => String(row.id) === selectedRegion)?.nome;
  const stateName = states?.items.find((row) => row.sigla === selectedState)?.nome ?? selectedState;
  element("results-heading").textContent = showCities
    ? "Municípios" + (stateName ? " · " + stateName : "")
    : "Estados" + (regionName ? " · " + regionName : "");
  element("search-label").textContent = showCities ? "Filtrar municípios" : "Filtrar estados";
  element("name-column").textContent = showCities ? "Município" : "Estado";
  element("uf-column").hidden = showCities;
  element("gazette-column").hidden = !showCities;
  search.disabled = status !== "ready";
  results.setAttribute("aria-busy", String(status === "loading"));

  const keyword = normalize(search.value.trim());
  const eligible = (showCities ? dataset?.items ?? [] : visibleStates())
    .filter((row) => normalize(row.nome).includes(keyword) || String(row.id).includes(keyword)
      || Boolean(row.sigla && normalize(row.sigla).includes(keyword)));
  const unit = showCities
    ? eligible.length === 1 ? "município" : "municípios"
    : eligible.length === 1 ? "estado" : "estados";
  const count = status === "ready" ? numberFormat.format(eligible.length) + " " + unit : "";
  element("results-count").textContent = count;

  const message = element("result-message");
  message.toggleAttribute("data-error", status === "error");
  message.hidden = status === "ready" && eligible.length > 0;
  const resultStatus = element("results-status");
  if (status === "loading") {
    resultStatus.textContent = showCities ? "Carregando municípios…" : "Carregando regiões e estados…";
  } else if (status === "error") {
    resultStatus.textContent = !connected
      ? "A conexão com o host falhou. Abra o explorador novamente na conversa."
      : showCities ? "Não foi possível consultar os municípios." : "Não foi possível carregar regiões e estados.";
  } else {
    resultStatus.textContent = keyword ? "Nenhuma localidade corresponde ao filtro." : "Nenhuma localidade disponível neste recorte.";
  }
  element("retry").hidden = !connected || status !== "error";

  const pageCount = Math.max(1, Math.ceil(eligible.length / pageSize));
  page = Math.min(page, pageCount - 1);
  const start = page * pageSize;
  table.hidden = !message.hidden;
  tbody.replaceChildren(...(table.hidden ? [] : eligible.slice(start, start + pageSize)
    .map((row) => localityRow(row, showCities))));
  element("pagination").hidden = table.hidden || pageCount < 2;
  previous.disabled = page === 0;
  next.disabled = page + 1 === pageCount;
  element("page-label").textContent = "Página " + (page + 1) + " de " + pageCount;
  updateSource(dataset);
}

async function loadDirectory() {
  directoryStatus = "loading";
  renderResults();
  const [regionResult, stateResult] = await Promise.allSettled([
    regions ?? lookup({ tipo: "regioes" }),
    states ?? lookup({ tipo: "estados" }),
  ]);
  if (regionResult.status === "fulfilled") regions ??= regionResult.value;
  if (stateResult.status === "fulfilled") states ??= stateResult.value;
  directoryStatus = regions && states ? "ready" : "error";
  renderControls();
  renderResults();
}

async function loadCities() {
  const token = ++activeCityRequest;
  const query: Query = nationwide ? { tipo: "municipios" } : { tipo: "municipios_por_uf", uf: selectedState };
  cityStatus = "loading";
  cities = undefined;
  renderResults();
  try {
    const dataset = await lookup(query);
    if (token !== activeCityRequest) return;
    cities = dataset;
    cityStatus = "ready";
  } catch {
    if (token !== activeCityRequest) return;
    cityStatus = "error";
  }
  renderResults();
}

function resetSearch() {
  page = 0;
  search.value = "";
}

function changeState(uf: string) {
  gazetteSearch.hide();
  userSelected = true;
  selectedState = uf;
  nationwide = false;
  activeCityRequest++;
  cities = undefined;
  resetSearch();
  renderControls();
  if (selectedState) void loadCities();
  else renderResults();
}

function acceptInitialResult(result: CallToolResult) {
  const query = initialQuery;
  if (!query || userSelected) return;
  initialQuery = undefined;
  try {
    const dataset = readDataset(result);
    switch (query.tipo) {
      case "regioes": regions = dataset; break;
      case "estados": states = dataset; break;
      default:
        nationwide = query.tipo === "municipios";
        selectedState = query.tipo === "municipios_por_uf" ? query.uf : "";
        cities = dataset;
        cityStatus = "ready";
    }
    if (regions && states) directoryStatus = "ready";
  } catch {
    if (query.tipo === "municipios_por_uf" || query.tipo === "municipios") {
      nationwide = query.tipo === "municipios";
      selectedState = query.tipo === "municipios_por_uf" ? query.uf : "";
      cityStatus = "error";
      cities = undefined;
    }
  }
  renderControls();
  renderResults();
}

function applyHostContext(context: HostContext) {
  if (context.theme) applyDocumentTheme(context.theme);
  if (context.safeAreaInsets) {
    for (const edge of ["top", "right", "bottom", "left"] as const) {
      const inset = context.safeAreaInsets[edge];
      if (Number.isFinite(inset)) root.style.setProperty("--safe-" + edge, Math.max(0, inset) + "px");
    }
  }
}

region.addEventListener("change", () => {
  selectedRegion = region.value;
  changeState("");
});
state.addEventListener("change", () => changeState(state.value));
search.addEventListener("input", () => {
  userSelected = true;
  page = 0;
  renderResults();
});
previous.addEventListener("click", () => {
  userSelected = true;
  page--;
  renderResults();
  if (previous.disabled && !next.disabled) next.focus();
});
next.addEventListener("click", () => {
  userSelected = true;
  page++;
  renderResults();
  if (next.disabled && !previous.disabled) previous.focus();
});
element("retry").addEventListener("click", () => {
  if (selectedState || nationwide) void loadCities();
  else void loadDirectory();
});
sourceLink.addEventListener("click", async () => {
  const url = sourceUrl;
  const indicator = element("source-status");
  try {
    const response = await app.openLink({ url });
    if (!response.isError) return;
  } catch {
    // Hosts may require a copyable address in place of opening an external link.
  }
  if (sourceUrl === url) {
    indicator.textContent = "Endereço da fonte: " + url;
    indicator.hidden = false;
  }
});

app.ontoolinput = (input) => {
  initialQuery = queryFromInput(input.arguments);
};
app.ontoolresult = acceptInitialResult;
app.ontoolcancelled = () => acceptInitialResult({ content: [], isError: true });
app.onhostcontextchanged = applyHostContext;

app.connect().then(() => {
  connected = true;
  const context = app.getHostContext();
  if (context) applyHostContext(context);
  void loadDirectory();
}).catch(() => {
  directoryStatus = "error";
  renderResults();
});
