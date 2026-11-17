import type { App } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type City = { code: string; name: string };
type Search = { query: string; territory_id?: string; since?: string; until?: string; page: number; size: number };
type Gazette = { date: string; title: string; edition?: string; excerpt?: string; url?: string };
type Results = { total: number; gazettes: Gazette[]; fetchedAt?: Date };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const codePattern = /^\d{7}$/;
const source = "Fonte · Querido Diário — Open Knowledge Brasil";
const fileHosts = new Set([
  "data.queridodiario.org.br",
  "data.queridodiario.ok.org.br",
  "querido-diario.nyc3.cdn.digitaloceanspaces.com",
  "querido-diario.nyc3.digitaloceanspaces.com",
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fileUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const knownHost = fileHosts.has(url.hostname) || url.hostname.endsWith(".gov.br");
    if (url.protocol === "https:" && !url.port && knownHost && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    return;
  }
}

function readResults(result: CallToolResult, code?: string): Results {
  if (result.isError) throw new Error("Provider unavailable");
  let data: unknown = result.structuredContent;
  if (!data) {
    const fallback = result.content.find((part) => part.type === "text");
    if (fallback?.type === "text") data = JSON.parse(fallback.text);
  }
  if (!record(data) || !record(data.results) || !Array.isArray(data.results.gazettes)) {
    throw new Error("Invalid gazette search");
  }
  const { total_gazettes: total, gazettes } = data.results;
  if (typeof total !== "number" || !Number.isSafeInteger(total) || total < gazettes.length) {
    throw new Error("Invalid gazette count");
  }

  const entries = gazettes.map((entry: unknown): Gazette => {
    if (!record(entry) || typeof entry.territory_name !== "string" || typeof entry.date !== "string"
      || !datePattern.test(entry.date) || (code && entry.territory_id !== code)) {
      throw new Error("Invalid gazette record for this municipality");
    }
    return {
      title: entry.territory_name + (typeof entry.state_code === "string" ? " · " + entry.state_code : ""),
      date: entry.date.split("-").reverse().join("/"),
      edition: typeof entry.edition === "string" && entry.edition ? entry.edition : undefined,
      excerpt: Array.isArray(entry.excerpts)
        ? entry.excerpts.find((text: unknown) => typeof text === "string" && text.trim()) : undefined,
      url: fileUrl(entry.url),
    };
  });
  const timestamp = record(data.provenance) && typeof data.provenance.fetchedAt === "string"
    ? Date.parse(data.provenance.fetchedAt) : NaN;
  return { total, gazettes: entries, fetchedAt: Number.isFinite(timestamp) ? new Date(timestamp) : undefined };
}

export function createGazetteSearch(app: App, embedded: boolean) {
  const root = document.querySelector<HTMLElement>(".gazette-search")!;
  const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>("#gazette-" + id)!;
  const heading = el("heading");
  const form = root.querySelector("form")!;
  const territory = el<HTMLInputElement>("territory");
  const term = el<HTMLInputElement>("query");
  const since = el<HTMLInputElement>("since");
  const until = el<HTMLInputElement>("until");
  const submit = el<HTMLButtonElement>("submit");
  const results = root.querySelector(".gazette-results")!;
  const status = el("status");
  const list = el("list");
  const pager = el("pagination");
  const previous = el<HTMLButtonElement>("previous");
  const next = el<HTMLButtonElement>("next");
  const retry = el<HTMLButtonElement>("retry");
  const footer = el("source");
  let city: City | undefined;
  let last: Search | undefined;
  let requestId = 0;
  let started = false;
  let trigger: HTMLButtonElement | undefined;

  root.hidden = embedded;
  el("territory-field").hidden = embedded;
  el("close").hidden = !embedded;

  function clear(message: string, busy = false) {
    results.setAttribute("aria-busy", String(busy));
    status.textContent = message;
    retry.hidden = true;
    list.replaceChildren();
    pager.hidden = true;
    footer.textContent = source;
  }

  function renderGazette(entry: Gazette) {
    const row = document.createElement("li");
    const title = document.createElement("h3");
    title.textContent = entry.title;
    const detail = document.createElement("p");
    detail.textContent = entry.date + (entry.edition ? " · Edição " + entry.edition : "");
    row.append(title, detail);
    if (entry.excerpt) {
      const excerpt = document.createElement("p");
      excerpt.textContent = entry.excerpt;
      row.append(excerpt);
    }
    if (entry.url) {
      const url = entry.url;
      const button = document.createElement("button");
      const feedback = document.createElement("p");
      feedback.className = "gazette-link-status";
      feedback.setAttribute("role", "status");
      feedback.hidden = true;
      button.type = "button";
      button.textContent = "Abrir edição ↗";
      button.setAttribute("aria-label", "Abrir edição de " + entry.title + " de " + entry.date);
      button.addEventListener("click", async () => {
        try {
          if (!(await app.openLink({ url })).isError) return;
        } catch {
          // The host can decline link opening.
        }
        feedback.textContent = "Endereço da edição: " + url;
        feedback.hidden = false;
      });
      row.append(button, feedback);
    }
    return row;
  }

  function renderResult(result: CallToolResult, args?: Search) {
    try {
      const { gazettes, total, fetchedAt } = readResults(result, args?.territory_id);
      const page = args?.page ?? 0;
      const count = new Intl.NumberFormat("pt-BR").format(total);
      clear(gazettes.length
        ? count + (total === 1 ? " edição encontrada" : " edições encontradas")
        : total ? "Nenhuma publicação nesta página." : "Nenhuma publicação encontrada neste recorte.");
      if (fetchedAt) footer.textContent = source + " · Consulta em " + dateFormat.format(fetchedAt);
      list.replaceChildren(...gazettes.map(renderGazette));
      if (args) {
        previous.disabled = page === 0;
        next.disabled = !gazettes.length || (page + 1) * args.size >= total;
        pager.hidden = previous.disabled && next.disabled;
        el("page").textContent = "Página " + (page + 1);
      }
    } catch {
      clear("Não foi possível consultar o Querido Diário. Tente novamente.");
      retry.hidden = !args;
    }
  }

  async function load(args: Search) {
    last = args;
    const id = ++requestId;
    clear("Buscando publicações…", true);
    try {
      const result = await app.callServerTool({ name: "querido_diario", arguments: args }, { timeout: 15_000 });
      if (id === requestId) renderResult(result, args);
    } catch {
      if (id === requestId) renderResult({ content: [], isError: true }, args);
    }
  }

  function hide() {
    requestId++;
    city = undefined;
    last = undefined;
    trigger = undefined;
    root.hidden = true;
  }

  el("close").addEventListener("click", () => {
    const returnFocus = trigger?.isConnected ? trigger : document.getElementById("municipality-search");
    hide();
    returnFocus?.focus();
  });
  function search() {
    if (submit.disabled || !form.reportValidity()) return;
    const code = city?.code ?? territory.value.trim();
    const query = term.value.trim();
    if ((embedded && !code) || (!code && !query)) {
      status.textContent = "Informe um município ou um termo para buscar.";
      return;
    }
    if (since.value && until.value && since.value > until.value) {
      status.textContent = "A data inicial deve ser anterior ou igual à data final.";
      return;
    }
    started = true;
    void load({
      query, page: 0, size: 10,
      ...(code ? { territory_id: code } : {}),
      ...(since.value ? { since: since.value } : {}),
      ...(until.value ? { until: until.value } : {}),
    });
  }
  submit.addEventListener("click", search);
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      search();
    }
  });
  previous.addEventListener("click", () => {
    if (last && !previous.disabled) void load({ ...last, page: last.page - 1 });
  });
  next.addEventListener("click", () => {
    if (last && !next.disabled) void load({ ...last, page: last.page + 1 });
  });
  retry.addEventListener("click", () => {
    if (last) void load(last);
  });

  return {
    show(selected: City, button: HTMLButtonElement) {
      if (!codePattern.test(selected.code)) return;
      city = selected;
      trigger = button;
      root.hidden = false;
      el("location").textContent = selected.name + " · IBGE " + selected.code;
      form.reset();
      submit.disabled = false;
      heading.focus();
      void load({ query: "", territory_id: selected.code, page: 0, size: 10 });
    },
    hide,
    connect() {
      submit.disabled = false;
      if (!last) clear("Informe um município ou um termo para buscar.");
    },
    connectionFailed() {
      clear("A conexão com o host falhou. Abra o Querido Diário novamente na conversa.");
    },
    acceptInput(value: unknown) {
      if (started || !record(value) || typeof value.query !== "string") return;
      form.reset();
      territory.value = typeof value.territory_id === "string" && codePattern.test(value.territory_id) ? value.territory_id : "";
      term.value = value.query;
      since.value = typeof value.since === "string" ? value.since : "";
      until.value = typeof value.until === "string" ? value.until : "";
      last = {
        query: value.query,
        ...(territory.value ? { territory_id: territory.value } : {}),
        ...(since.value ? { since: since.value } : {}),
        ...(until.value ? { until: until.value } : {}),
        page: typeof value.page === "number" && Number.isSafeInteger(value.page) && value.page >= 0 ? value.page : 0,
        size: typeof value.size === "number" && Number.isSafeInteger(value.size) && value.size > 0 && value.size <= 100 ? value.size : 10,
      };
    },
    acceptResult(result: CallToolResult) {
      if (!started) renderResult(result, last);
    },
  };
}
