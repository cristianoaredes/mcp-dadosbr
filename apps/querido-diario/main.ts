import { App, applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { createGazetteSearch } from "./search.js";

const app = new App({ name: "Querido Diário", version: "1.0.0" });
const search = createGazetteSearch(app, false);
app.ontoolinput = ({ arguments: args }) => search.acceptInput(args);
app.ontoolresult = search.acceptResult;
app.ontoolcancelled = () => search.acceptResult({ content: [], isError: true });
app.onhostcontextchanged = ({ theme }) => {
  if (theme) applyDocumentTheme(theme);
};
app.connect().then(() => {
  const theme = app.getHostContext()?.theme;
  if (theme) applyDocumentTheme(theme);
  search.connect();
}).catch(search.connectionFailed);
