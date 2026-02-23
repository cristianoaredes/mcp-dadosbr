/**
 * Tool barrel — imports all domain tool files to trigger auto-registration.
 * 
 * Import order matters: core first (has shared utilities used by others),
 * then domains in dependency order.
 */

// Core tools (CNPJ, CEP, search, intelligence, thinking)
import "./core.js";

// Domain tools — each self-registers on import
import "./government.js";
import "./legal.js";
import "./company.js";
import "./financial.js";
import "./health.js";
import "./osint.js";

// Re-export registry API for consumers
export {
    getToolDefinitions,
    executeRegisteredTool,
    hasTool,
    getToolCount,
} from "../core/registry.js";
