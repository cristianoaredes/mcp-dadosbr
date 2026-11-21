# Política de Privacidade e Transparência LGPD — MCP DadosBR

Este documento descreve como o **MCP DadosBR** trata dados durante consultas sob demanda a fontes públicas brasileiras e define diretrizes de governança e conformidade com a **Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD)** para operadores, integradores e titulares de dados.

> **Importante:** O MCP DadosBR é um software open source (`AGPL-3.0-only`) executado localmente pelo usuário (CLI `stdio` / `HTTP/SSE`) ou auto-hospedado por um operador (ex.: Cloudflare Workers). Quem implanta e opera uma instância do servidor atua como agente de tratamento (controlador ou operador, conforme o contexto de uso) e é responsável por observar as obrigações legais aplicáveis ao seu ambiente e finalidade.

---

## 1. Escopo de dados consultados sob demanda

O MCP DadosBR atua como camada de consulta sob demanda a portais e APIs públicas ou comunitárias brasileiras, além de ferramentas auxiliares locais:

- **Dados empresariais e de endereço:** CNPJ (OpenCNPJ, ReceitaWS, BrasilAPI, MinhaReceita) e CEP (OpenCEP, ViaCEP, BrasilAPI).
- **Dados governamentais, fiscais e de transparência:** IBGE (`ibge_localidades`), Querido Diário (`querido_diario`), PNCP (`pncp_licitacoes`), Portal da Transparência / CGU (`transparencia_lookup`, `ceis_cnep_lookup` para CEIS/CNEP/CEPIM).
- **Dados econômicos e setoriais:** Banco Central / SGS (`bacen_taxas`), tabela FIPE (`fipe_veiculos`), CNES / DataSUS (`cnes_saude`), Consumidor.gov.br (`consumidor_reclamacoes`) e RDAP / Registro.br (`domain_whois`).
- **Dados jurídicos, sancionatórios e de segurança pública:** CNJ DataJud (`datajud_processos`), CNJ BNMP (`bnmp_mandados`), MJSP Projeto Captura (`procurados_lookup`), OAB/CNA (`oab_advogado`) e Lista Suja do Trabalho Escravo (`lista_suja_lookup`).
- **OSINT e busca web opcional:** `cnpj_search`, `cnpj_intelligence` e `strategic_osint_prompt`, utilizando provedores de busca web quando configurados pelo operador.
- **Validação sintática local:** `cpf_validate` valida exclusivamente o dígito verificador (módulo 11) e a região fiscal do 9º dígito em memória local, **sem consultar a Receita Federal** e sem verificar existência civil ou titularidade.

---

## 2. Finalidade, adequação e bases legais para operadores (LGPD Art. 6º e Art. 7º)

Consultas envolvendo dados relacionados a pessoas naturais identificadas ou identificáveis (como sócios/QSA em fichas de CNPJ, advogados na OAB, partes em processos no DataJud, pessoas em mandados do BNMP, procurados do MJSP ou registros sancionatórios) devem respeitar rigorosamente os princípios da LGPD:

- **Finalidade (LGPD Art. 6º, I):** tratar os dados apenas para propósitos legítimos, específicos, explícitos e informados ao titular quando aplicável, vedado o uso incompatível ou discriminatório.
- **Adequação (LGPD Art. 6º, II) e Necessidade / Minimização (LGPD Art. 6º, III):** limitar consultas e retenção ao mínimo estritamente necessário para a finalidade pretendida (ex.: due diligence, compliance anticorrupção, verificação cadastral ou pesquisa jurídica).
- **Qualidade e Transparência (LGPD Art. 6º, V e VI):** validar a atualidade e exatidão na fonte oficial antes de tomar decisões baseadas em consultas intermediárias.
- **Bases legais (LGPD Art. 7º e §§3º-4º):** o operador deve documentar a hipótese legal aplicável antes de habilitar o servidor para usuários finais ou fluxos automatizados (por exemplo: cumprimento de obrigação legal ou regulatória, exercício regular de direitos, proteção ao crédito ou legítimo interesse devidamente avaliado), observando que o acesso a dados tornados manifestamente públicos pelo titular ou por obrigação legal permanece sujeito à finalidade, boa-fé e ao interesse público que justificou sua disponibilização (Art. 7º, §§3º e 4º).

---

## 3. Fluxo efêmero vs. cache local/KV e direitos do titular (LGPD Art. 18)

O MCP DadosBR **não mantém banco de dados permanente próprio** com cadastros de titulares:

- **Repasse efêmero (pass-through):** em execuções sem cache ou após expiração, os dados retornados pelos órgãos e APIs de origem são apenas serializados na resposta ao cliente MCP/HTTP e não são gravados em armazenamento persistente pelo código do servidor.
- **Cache em memória (CLI Node.js):** quando habilitado, `MemoryCache` armazena respostas temporariamente em RAM com capacidade e TTL configuráveis (`MCP_CACHE_SIZE`, padrão `256` entradas; `MCP_CACHE_TTL`, padrão `3600000` ms / 1 hora), descartadas ao reiniciar o processo ou ao expirar o TTL.
- **Cache e rate limit em borda (Cloudflare Workers):** quando o binding `MCP_CACHE` é configurado no Worker, `KVCache` armazena respostas temporariamente com expiração obrigatória (`MCP_CACHE_TTL`, mínimo de `60` segundos em KV — `MIN_KV_EXPIRATION_TTL_SECONDS`). Quando `MCP_KV` é configurado, chaves transitórias de controle de taxa (`rate_limit:<identificador>:<bucket>`) são gravadas com `expirationTtl` automático.
- **Logs e redação:** logs estruturados de ferramentas e rate limiting aplicam mascaramento/redação de PII e credenciais (`lib/shared/log-redaction.ts`), sem registrar pensamentos de `sequentialthinking` por padrão (`DISABLE_THOUGHT_LOGGING`).

Nos termos da **LGPD Art. 18**, titulares têm direito à confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos, inexatos ou desatualizados, anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade, informação sobre compartilhamento e revisão de decisões automatizadas (Art. 20):

- **Correção na fonte primária:** como o MCP DadosBR apenas consulta fontes oficiais e comunitárias externas, eventual retificação ou exclusão no registro de origem deve ser solicitada diretamente ao respectivo órgão controlador (CNJ, MJSP, CGU, Receita Federal, OAB, IBGE etc.).
- **Eliminação de cache em instância operada:** caso uma instância auto-hospedada mantenha cache ativo em KV (`MCP_CACHE`), o operador da instância deve atender pedidos procedentes de bloqueio ou eliminação invalidando as chaves correspondentes antes do término do TTL.

---

## 4. Transparência sobre provedores externos e infraestrutura de borda

Dependendo da configuração do operador e das ferramentas acionadas, termos de consulta e metadados de rede podem trafegar por terceiros:

- **Tavily (`TAVILY_API_KEY`) e Perplexity (`PERPLEXITY_API_KEY`):** quando configuradas pelo operador e usadas pelas ferramentas `cnpj_search` ou `cnpj_intelligence`, os termos de busca (ex.: razão social, CNPJ ou consultas OSINT) são enviados às APIs da Tavily e/ou Perplexity para recuperação de resultados web.
- **Cloudflare Workers / KV:** quando implantado no runtime serverless da Cloudflare, as requisições HTTP/SSE/MCP, cabeçalhos de rede e eventuais dados em `MCP_CACHE` / `MCP_KV` são processados na rede de borda da Cloudflare conforme a configuração e os termos de processamento de dados contratados pelo operador da conta.
- **Portais públicos e comunitários brasileiros:** cada ferramenta consulta diretamente o endpoint oficial ou comunitário correspondente (OpenCNPJ, OpenCEP, IBGE, BCB, PNCP, Portal da Transparência, CNJ DataJud/BNMP, MJSP Projeto Captura, OAB/CNA, DataSUS, Consumidor.gov.br, Registro.br RDAP, Querido Diário).
- **Transferência internacional (LGPD Art. 33):** se o operador configurar provedores externos com processamento fora do Brasil (como Tavily, Perplexity ou nós de borda globais), cabe ao operador assegurar base jurídica adequada para transferência internacional de dados.

---

## 5. Salvaguardas contra homônimos e decisões automatizadas (LGPD Art. 20)

Consultas baseadas em nome ou fragmentos textuais — especialmente em bases penais, judiciais ou sancionatórias — apresentam **risco elevado de homônimos**, registros desatualizados ou respostas parciais/inconclusivas na origem (por exemplo, `procurados_lookup` realiza busca por tokens parciais do nome sem CPF ou data de nascimento; `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos` também aceitam pesquisas nominais ou textuais).

Em conformidade com a **LGPD Art. 20** (direito à revisão de decisões tomadas unicamente com base em tratamento automatizado):

1. Os resultados de `procurados_lookup`, `bnmp_mandados`, `ceis_cnep_lookup` e `datajud_processos` incluem o campo estruturado `lgpd_notice` alertando sobre risco de homônimos e exigência de revisão humana.
2. **É vedado** utilizar retornos dessas ferramentas como critério único e automatizado para negativa de crédito, recusa contratual, bloqueio cadastral, desligamento ou restrição de direitos de pessoa física ou jurídica.
3. Toda correspondência positiva ou inconclusiva deve passar por **revisão humana prévia**, com conferência do documento completo (CPF/CNPJ), dados qualificativos aplicáveis (filiação, data de nascimento, UF) e validação direta no portal oficial correspondente antes de qualquer decisão.

---

## 6. Canal do Encarregado / DPO (LGPD Art. 41) e incidentes (LGPD Art. 48)

- **Para operadores que auto-hospedam o MCP DadosBR:** defina a variável de ambiente **`MCP_DPO_CONTACT`** (por exemplo, o endereço de e-mail institucional ou URL do canal do Encarregado pelo Tratamento de Dados Pessoais da sua organização). No Cloudflare Worker, o endpoint público `GET /` expõe automaticamente esse valor no objeto `privacy.dpo_contact` (com fallback para esta política quando não configurado), e o esquema `/openapi.json` referencia esta política em `info.contact` e `info["x-privacy-policy"]`.
- **Para dúvidas, solicitações de privacidade ou reportes aos mantenedores do projeto open source MCP DadosBR:**
  - Questões gerais de privacidade e documentação: abra uma issue pública em [github.com/cristianoaredes/mcp-dadosbr/issues](https://github.com/cristianoaredes/mcp-dadosbr/issues) (sem expor dados pessoais sensíveis de terceiros no relato público).
  - Reporte confidencial de vulnerabilidades ou incidentes de segurança envolvendo o projeto: utilize o canal privado de [GitHub Security Advisories](https://github.com/cristianoaredes/mcp-dadosbr/security/advisories/new).
- **Resposta a incidentes e notificação à ANPD (LGPD Art. 48):** o procedimento operacional interno para triagem, contenção, avaliação de risco/dano aos titulares, comunicação à Autoridade Nacional de Proteção de Dados (ANPD) e aos titulares nos termos da Resolução CD/ANPD nº 15/2024 está documentado em [`.archagents/10-runbooks.md`](.archagents/10-runbooks.md).
