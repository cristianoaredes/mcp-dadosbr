# Notice and Third-Party Acknowledgments

**MCP DadosBR by Orqo**
Copyright (c) 2024-2026 Cristiano Arêdes / Orqo (<https://orqo.pro/>)

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU Affero General Public License, version 3 (`AGPL-3.0-only`)**, as published by the Free Software Foundation. See the full verbatim license text in [LICENSE](LICENSE).

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

> Note on historical versions: releases up to `0.5.0` were distributed under the MIT License; starting with `0.6.0`, this project is distributed under `AGPL-3.0-only`.

---

## Third-Party Services, Protocols, and APIs

This project integrates with public APIs and open-source components maintained by third parties. Their terms of service and licenses apply independently.

### OpenCNPJ API

- Website: <https://opencnpj.org/>
- GitHub: <https://github.com/Hitmasu/opencnpj>
- Service: Free Brazilian company data API
- Usage: Default CNPJ lookup provider (`cnpj_lookup`)
- Terms: Refer to OpenCNPJ's terms of service

### OpenCEP API

- Website: <https://opencep.com/>
- GitHub: <https://github.com/SeuAliado/OpenCEP>
- Service: Free Brazilian postal code API
- Usage: Default CEP lookup provider (`cep_lookup`)
- Terms: Refer to OpenCEP's terms of service

### Model Context Protocol (MCP)

- Website: <https://modelcontextprotocol.io/>
- Maintainer: Anthropic / Model Context Protocol contributors
- License: MIT
- Usage: Core protocol SDK (`@modelcontextprotocol/sdk`) and MCP Apps extension (`@modelcontextprotocol/ext-apps`)

### Brazilian Public Data Sources

- **IBGE — API de Localidades:** <https://servicodados.ibge.gov.br/api/v1/localidades>
- **Open Knowledge Brasil — Querido Diário:** <https://queridodiario.ok.org.br/>
- **Banco Central do Brasil — BCData/SGS:** <https://www3.bcb.gov.br/sgspub/>
- **Portal Nacional de Contratações Públicas (PNCP):** <https://pncp.gov.br/>
- **Portal da Transparência / CGU:** <https://portaldatransparencia.gov.br/>
- **CNJ — DataJud & BNMP:** <https://www.cnj.jus.br/>
- **DataSUS — CNES:** <https://apidadosabertos.saude.gov.br/>
- **BrasilAPI (FIPE / CNPJ / CEP):** <https://brasilapi.com.br/>
- **Registro.br (RDAP):** <https://rdap.registro.br/>
- **SENACON — Consumidor.gov.br:** <https://www.consumidor.gov.br/>
- **MJSP — Projeto Captura:** <https://www.gov.br/mj/>

We are grateful to the maintainers of these open protocols and public data initiatives.
