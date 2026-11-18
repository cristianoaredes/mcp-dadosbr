import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PNCP_MODALIDADES, PNCP_ORIGIN, pncpCnpj, pncpDate, pncpNoticeUrl, positiveInteger } from "../../lib/shared/pncp.js";

type Search = {
  query: "";
  data_inicial: string;
  data_final: string;
  modalidade_id: number;
  pagina: number;
  cnpj_orgao?: string;
};

const app = new App({ name: "Editais do PNCP", version: "1.0.0" });
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const org = el<HTMLInputElement>("org");
const modality = el<HTMLSelectElement>("modality");
const start = el<HTMLInputElement>("start");
const end = el<HTMLInputElement>("end");
const search = el<HTMLButtonElement>("search");
const retry = el<HTMLButtonElement>("retry");
const previous = el<HTMLButtonElement>("previous");
const next = el<HTMLButtonElement>("next");
const navigation = el("pagination");
const noticeList = el("notices");
const legacy = el<HTMLButtonElement>("legacy-search");
const feedback = el("link-status");
const formatNumber = new Intl.NumberFormat("pt-BR");
const saoPaulo = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const timestamp = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
let connected = false;
let requestId = 0;
let userChanged = false;
let initial: Search | undefined;
let term = "";
let current: Search | undefined;

for (const [id, name] of PNCP_MODALIDADES) modality.add(new Option(name, String(id)));
modality.value = "6";
end.value = saoPaulo.format(new Date());
start.value = new Date(Date.parse(end.value) - 6 * 86_400_000).toISOString().slice(0, 10);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function linkButton(url: string, label: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => { void openLink(url); });
  return button;
}

async function openLink(url: string) {
  const request = requestId;
  feedback.hidden = true;
  try {
    if (!(await app.openLink({ url })).isError) return;
  } catch {
    // The host can decline link opening.
  }
  if (request === requestId) {
    feedback.textContent = "Endereço no PNCP · " + url;
    feedback.hidden = false;
  }
}

function brazilianDate(value: unknown) {
  if (typeof value !== "string") return;
  const date = pncpDate(value.slice(0, 10));
  return date?.split("-").reverse().join("/");
}

function renderNotice(value: Record<string, unknown>) {
  const orgao = isRecord(value.orgaoEntidade) ? value.orgaoEntidade : {};
  const row = document.createElement("li");
  row.className = "notice";
  const title = document.createElement("h2");
  title.textContent = typeof value.numeroControlePNCP === "string" && value.numeroControlePNCP
    ? value.numeroControlePNCP : "Edital publicado";
  const details = document.createElement("p");
  details.textContent = [
    orgao.razaoSocial,
    pncpCnpj(orgao.cnpj),
    value.tipoInstrumentoConvocatorioNome,
    value.modalidadeNome,
    brazilianDate(value.dataPublicacaoPncp),
  ].filter((part) => typeof part === "string" && part).join(" · ");
  const description = document.createElement("p");
  description.className = "description";
  description.textContent = typeof value.objetoCompra === "string" ? value.objetoCompra : "";
  row.append(title, details, description);
  const url = pncpNoticeUrl(orgao.cnpj, value.anoCompra, value.sequencialCompra);
  if (url) {
    const link = linkButton(url, "Abrir no PNCP ↗");
    link.setAttribute("aria-label", "Abrir " + title.textContent + " no PNCP");
    row.append(link);
  }
  return row;
}

function showStatus(message: string, options: { busy?: boolean; failed?: boolean } = {}) {
  el("results").setAttribute("aria-busy", String(Boolean(options.busy)));
  el("status").textContent = message;
  el("status").parentElement?.toggleAttribute("data-error", Boolean(options.failed));
  retry.hidden = !options.failed || !current;
  legacy.hidden = true;
  feedback.hidden = true;
  noticeList.replaceChildren();
  navigation.hidden = true;
  previous.disabled = true;
  next.disabled = true;
  el("retrieved").textContent = "";
}

function render(result: CallToolResult, filters: Search) {
  if (result.isError) throw new Error("PNCP tool returned an error");
  let payload: unknown = result.structuredContent;
  if (!payload) {
    const text = result.content.find((element) => element.type === "text");
    if (text?.type === "text") payload = JSON.parse(text.text);
  }
  if (!isRecord(payload) || !isRecord(payload.results)) throw new Error("Invalid PNCP response");
  const { data, numeroPagina, totalRegistros, totalPaginas } = payload.results;
  if (!Array.isArray(data) || !data.every(isRecord) || numeroPagina !== filters.pagina
    || typeof totalRegistros !== "number" || !Number.isSafeInteger(totalRegistros) || totalRegistros < data.length
    || typeof totalPaginas !== "number" || !Number.isSafeInteger(totalPaginas) || totalPaginas < 0) {
    throw new Error("Invalid PNCP pagination");
  }
  const count = formatNumber.format(totalRegistros);
  showStatus(data.length ? count + (totalRegistros === 1 ? " publicação encontrada" : " publicações encontradas")
    : totalRegistros > 0 ? "Nenhuma publicação nesta página." : "Nenhuma publicação encontrada com esses filtros.");
  noticeList.replaceChildren(...data.map(renderNotice));
  previous.disabled = filters.pagina <= 1;
  next.disabled = filters.pagina >= totalPaginas;
  navigation.hidden = previous.disabled && next.disabled;
  el("page-label").textContent = data.length
    ? "Página " + formatNumber.format(filters.pagina) + " de " + formatNumber.format(totalPaginas)
    : "Página " + formatNumber.format(filters.pagina);
  const fetchedAt = isRecord(payload.provenance) && typeof payload.provenance.fetchedAt === "string"
    ? Date.parse(payload.provenance.fetchedAt) : NaN;
  if (Number.isFinite(fetchedAt)) el("retrieved").textContent = "Consultado em " + timestamp.format(fetchedAt);
}

async function load(filters: Search) {
  userChanged = true;
  current = filters;
  const id = ++requestId;
  showStatus("Consultando o PNCP…", { busy: true });
  try {
    const result = await app.callServerTool({ name: "pncp_licitacoes", arguments: filters }, { timeout: 25_000 });
    if (id === requestId) render(result, filters);
  } catch {
    if (id === requestId) showStatus("Não foi possível consultar o PNCP. Confira os filtros e tente novamente.", { failed: true });
  }
}

function readInputs(value: Record<string, unknown>): Search | undefined {
  const from = pncpDate(value.data_inicial);
  const to = pncpDate(value.data_final);
  const id = value.modalidade_id;
  const page = value.pagina ?? 1;
  const cnpj = pncpCnpj(value.cnpj_orgao);
  if ((value.query !== "" && value.query !== undefined) || !from || !to || from > to
      || !positiveInteger(id) || !positiveInteger(page) || (value.cnpj_orgao && !cnpj)) return;
  return {
    query: "", data_inicial: from, data_final: to, modalidade_id: id, pagina: page,
    ...(cnpj ? { cnpj_orgao: cnpj } : {}),
  };
}

function submit() {
  if (!connected) return;
  const filters = readInputs({
    data_inicial: start.value,
    data_final: end.value,
    modalidade_id: Number(modality.value),
    cnpj_orgao: org.value.trim(),
  });
  if (!filters) {
    userChanged = true;
    requestId++;
    current = undefined;
    showStatus("Informe um período válido, uma modalidade e, se desejar, os 14 caracteres do CNPJ do órgão.", { failed: true });
    return;
  }
  void load(filters);
}

search.addEventListener("click", submit);
for (const field of [org, start, end]) {
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      submit();
    }
  });
}
retry.addEventListener("click", () => { if (current) void load(current); });
previous.addEventListener("click", () => {
  if (current && !previous.disabled) void load({ ...current, pagina: current.pagina - 1 });
});
next.addEventListener("click", () => {
  if (current && !next.disabled) void load({ ...current, pagina: current.pagina + 1 });
});
legacy.addEventListener("click", () => { void openLink(PNCP_ORIGIN + "/app/editais?q=" + encodeURIComponent(term)); });
el("source").addEventListener("click", () => { void openLink(PNCP_ORIGIN + "/app/editais"); });

app.ontoolinput = ({ arguments: args }) => {
  if (userChanged) return;
  initial = readInputs(args);
  term = typeof args.query === "string" ? args.query : "";
  if (!initial) return;
  start.value = initial.data_inicial;
  end.value = initial.data_final;
  org.value = initial.cnpj_orgao ?? "";
  const id = String(initial.modalidade_id);
  if (!Array.from(modality.options).some((option) => option.value === id)) {
    modality.add(new Option("Modalidade " + id, id));
  }
  modality.value = id;
};
app.ontoolresult = (result) => {
  if (userChanged) return;
  if (!initial) {
    showStatus("Use o período e a modalidade para consultar as publicações.");
    legacy.hidden = !term.trim();
    return;
  }
  current = initial;
  try {
    render(result, initial);
  } catch {
    showStatus("Não foi possível consultar o PNCP. Confira os filtros e tente novamente.", { failed: true });
  }
};
app.ontoolcancelled = () => {
  if (!userChanged) showStatus("Consulta cancelada. Use os filtros para tentar novamente.");
};
app.onhostcontextchanged = ({ theme }) => { if (theme) applyDocumentTheme(theme); };
app.connect().then(() => {
  const theme = app.getHostContext()?.theme;
  if (theme) applyDocumentTheme(theme);
  connected = true;
  for (const field of [org, modality, start, end, search]) field.disabled = false;
  if (el("status").textContent === "Conectando ao servidor…") {
    el("status").textContent = "Use o período e a modalidade para consultar as publicações.";
  }
}).catch(() => showStatus("A conexão com o host falhou. Abra o painel novamente na conversa."));
