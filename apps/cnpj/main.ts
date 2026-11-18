import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { readCnpjProfile, type CnpjProfile } from "../../lib/shared/cnpj-profile.js";

const app = new App({ name: "Ficha por CNPJ", version: "1.0.0" });
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = el<HTMLInputElement>("cnpj");
const search = el<HTMLButtonElement>("search");
const section = el("profile");
const message = el("message");
const timestamp = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
});
let changed = false;
let requestId = 0;
let initial: string | undefined;

function normalize(value: unknown) {
  if (typeof value !== "string" || !/^[0-9./\s-]+$/.test(value)) return;
  const digits = value.replace(/\D/g, "");
  return digits.length === 14 ? digits : undefined;
}

function dateLabel(value?: string) {
  if (!value) return;
  const date = /^(\d{4})-(\d{2})-(\d{2})(?:T| |$)/.exec(value);
  if (date) return date.slice(1).reverse().join("/");
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
}

function paragraph(text: string) {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

function showStatus(text: string, busy = false) {
  section.hidden = true;
  message.textContent = text;
  message.setAttribute("aria-busy", String(busy));
}

function readResult(result: CallToolResult): CnpjProfile | undefined {
  const projected = result.structuredContent?.profile;
  if (!result.isError && projected && typeof projected === "object"
    && "cnpj" in projected && typeof projected.cnpj === "string"
    && "secondary" in projected && Array.isArray(projected.secondary)
    && "address" in projected && Array.isArray(projected.address)) {
    return projected as CnpjProfile;
  }
  const text = result.content.find((part) => part.type === "text");
  const data = text?.type === "text" ? JSON.parse(text.text) : undefined;
  if (result.isError) {
    if (typeof data?.error === "string" && /cnpj not found/i.test(data.error)) {
      showStatus("CNPJ não encontrado no provedor.");
    } else {
      showStatus("Não foi possível consultar o CNPJ. Confira o número e tente novamente.");
    }
    return;
  }
  return readCnpjProfile(data);
}

function render(result: CallToolResult, expected?: string) {
  try {
    const profile = readResult(result);
    if (result.isError) return;
    if (!profile || (expected && profile.cnpj !== expected)) {
      showStatus("O provedor não retornou uma ficha para o CNPJ consultado.");
      return;
    }

    input.value = profile.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    el("company").textContent = profile.name ?? "Razão social não informada";
    el("trade").textContent = profile.tradeName === profile.name ? "" : profile.tradeName ?? "";
    el("registration").textContent = "CNPJ " + input.value;
    el("situation").textContent = profile.status ?? "Não informada";
    const statusDate = dateLabel(profile.statusDate);
    el("status-date").textContent = statusDate ? "Desde " + statusDate : "";
    const activityLabel = ({ code, description }: NonNullable<CnpjProfile["primary"]>) =>
      code + (description ? " · " + description : "");
    el("primary").textContent = profile.primary ? activityLabel(profile.primary) : "Não informada";
    el("no-secondary").textContent = profile.secondary.length ? "" : "Nenhuma atividade secundária informada.";
    el("secondary").replaceChildren(...profile.secondary.map((item) => {
      const li = document.createElement("li");
      li.textContent = activityLabel(item);
      return li;
    }));
    el("address").replaceChildren(...(profile.address.length ? profile.address : ["Endereço não informado."]).map(paragraph));
    el("provider").textContent = profile.provider ?? "Provedor não informado.";
    const fetched = profile.fetchedAt ? Date.parse(profile.fetchedAt) : NaN;
    el("fetched").textContent = Number.isFinite(fetched) ? "Consultado em " + timestamp.format(fetched) : "";
    const updated = dateLabel(profile.updatedAt);
    el("updated").textContent = updated ? "Atualização informada pelo provedor em " + updated : "";
    section.hidden = false;
    message.textContent = "";
    message.setAttribute("aria-busy", "false");
  } catch {
    showStatus("Não foi possível ler a resposta do provedor.");
  }
}

async function submit() {
  if (search.disabled) return;
  changed = true;
  const id = ++requestId;
  const cnpj = normalize(input.value);
  if (!cnpj) {
    showStatus("Informe um CNPJ numérico de 14 dígitos.");
    input.focus();
    return;
  }
  showStatus("Consultando CNPJ…", true);
  try {
    const result = await app.callServerTool({ name: "cnpj_lookup", arguments: { cnpj } }, { timeout: 28_000 });
    if (id === requestId) render(result, cnpj);
  } catch {
    if (id === requestId) showStatus("Não foi possível consultar o CNPJ. Tente novamente.");
  }
}

search.addEventListener("click", () => { void submit(); });
input.addEventListener("input", () => {
  changed = true;
  requestId++;
  showStatus("Selecione Consultar para buscar o CNPJ informado.");
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); void submit(); }
});
app.ontoolinput = ({ arguments: args }) => {
  if (changed) return;
  initial = normalize(args.cnpj);
  if (initial) input.value = initial;
};
app.ontoolresult = (result) => { if (!changed) render(result, initial); };
app.ontoolcancelled = () => { if (!changed) showStatus("Consulta cancelada. Tente novamente."); };
app.onhostcontextchanged = ({ theme }) => { if (theme) applyDocumentTheme(theme); };
app.connect().then(() => {
  const theme = app.getHostContext()?.theme;
  if (theme) applyDocumentTheme(theme);
  input.disabled = search.disabled = false;
  if (message.textContent === "Conectando ao servidor…") {
    showStatus(initial ? "Consultando CNPJ…" : "Informe o CNPJ do estabelecimento.", Boolean(initial));
  }
}).catch(() => showStatus("A conexão com o host falhou. Abra a ficha novamente na conversa."));
