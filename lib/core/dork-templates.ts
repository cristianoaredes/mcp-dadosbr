/**
 * Dork Templates - Automatic Google Dorks generation based on CNPJ data
 */

export type DorkCategory = 'government' | 'legal' | 'news' | 'documents' | 'social' | 'partners' | 'security' | 'databases' | 'infrastructure' | 'social_media';

export interface DorkTemplate {
  category: DorkCategory;
  query: string;
  description: string;
}

/**
 * Interface for CNPJ data (supports multiple API formats)
 */
export interface CNPJData {
  cnpj?: string;
  taxId?: string;
  razao_social?: string;
  nome_fantasia?: string;
  alias?: string;
  qsa?: Array<{ nome?: string; qualificacao?: string }>;
  QSA?: Array<{ nome?: string; qualificacao?: string }>;
  company?: {
    name?: string;
    members?: Array<{ nome?: string; qualificacao?: string }>;
  };
  [key: string]: unknown; // Allow other properties
}

export function buildDorks(cnpjData: CNPJData, categories?: DorkCategory[]): DorkTemplate[] {
  const allDorks: DorkTemplate[] = [];

  // Support both API formats: open.cnpja.com and others
  const cnpj = cnpjData.cnpj || cnpjData.taxId || '';
  const razaoSocial = cnpjData.razao_social || cnpjData.company?.name || '';
  const nomeFantasia = cnpjData.nome_fantasia || cnpjData.alias || '';
  const qsa = cnpjData.qsa || cnpjData.QSA || cnpjData.company?.members || [];

  // Helper to filter by category
  const includeCategory = (cat: DorkCategory) => {
    return !categories || categories.length === 0 || categories.includes(cat);
  };

  // GOVERNMENT - Official records
  if (includeCategory('government')) {
    if (cnpj) {
      allDorks.push({
        category: 'government',
        query: `"${cnpj}" site:gov.br`,
        description: 'Government records by CNPJ'
      });
    }

    // Combine CNPJ + razao social for precision
    if (razaoSocial && cnpj) {
      allDorks.push({
        category: 'government',
        query: `"${cnpj}" "${razaoSocial}" site:transparencia.gov.br`,
        description: 'Transparency portal records'
      });

      allDorks.push({
        category: 'government',
        query: `"${cnpj}" site:portaldatransparencia.gov.br`,
        description: 'Federal transparency records'
      });
    }

    if (cnpj) {
      allDorks.push({
        category: 'government',
        query: `"${cnpj}" site:receita.fazenda.gov.br`,
        description: 'Federal Revenue records'
      });
    }
  }

  // LEGAL - Lawsuits and legal documents
  if (includeCategory('legal')) {
    // Always combine with CNPJ for precision
    if (razaoSocial && cnpj) {
      allDorks.push({
        category: 'legal',
        query: `"${cnpj}" "${razaoSocial}" site:jusbrasil.com.br`,
        description: 'Legal cases in JusBrasil'
      });

      allDorks.push({
        category: 'legal',
        query: `"${cnpj}" site:*.jus.br`,
        description: 'Court records'
      });
    }

    if (cnpj) {
      allDorks.push({
        category: 'legal',
        query: `"${cnpj}" site:*.jus.br`,
        description: 'Court records by CNPJ'
      });
    }

    if (nomeFantasia && nomeFantasia !== razaoSocial && cnpj) {
      allDorks.push({
        category: 'legal',
        query: `"${cnpj}" "${nomeFantasia}" site:jusbrasil.com.br`,
        description: 'Legal cases by trade name'
      });
    }
  }

  // NEWS - Recent news and articles
  if (includeCategory('news')) {
    // Use CNPJ for precision in news searches
    if (razaoSocial && cnpj) {
      allDorks.push({
        category: 'news',
        query: `"${cnpj}" "${razaoSocial}"`,
        description: 'News articles'
      });

      allDorks.push({
        category: 'news',
        query: `"${cnpj}" (site:g1.globo.com OR site:folha.uol.com.br OR site:estadao.com.br)`,
        description: 'Major news outlets'
      });
    }
  }

  // DOCUMENTS - PDFs, spreadsheets, etc.
  if (includeCategory('documents')) {
    if (cnpj) {
      allDorks.push({
        category: 'documents',
        query: `"${cnpj}" filetype:pdf`,
        description: 'PDF documents'
      });
    }

    if (razaoSocial) {
      allDorks.push({
        category: 'documents',
        query: `"${razaoSocial}" (filetype:pdf OR filetype:xls OR filetype:xlsx)`,
        description: 'Documents (PDF, Excel)'
      });
    }
  }

  // SOCIAL - LinkedIn, GitHub, social media
  if (includeCategory('social')) {
    if (razaoSocial) {
      allDorks.push({
        category: 'social',
        query: `"${razaoSocial}" site:linkedin.com`,
        description: 'LinkedIn company page'
      });
    }

    if (nomeFantasia && nomeFantasia !== razaoSocial) {
      allDorks.push({
        category: 'social',
        query: `"${nomeFantasia}" site:linkedin.com`,
        description: 'LinkedIn by trade name'
      });
    }

    // GitHub if tech company
    if (razaoSocial.toLowerCase().includes('tecnologia') ||
      razaoSocial.toLowerCase().includes('software') ||
      razaoSocial.toLowerCase().includes('sistemas')) {
      allDorks.push({
        category: 'social',
        query: `"${razaoSocial}" site:github.com`,
        description: 'GitHub repositories'
      });
    }
  }

  // PARTNERS - Search for company partners/directors
  if (includeCategory('partners') && qsa && qsa.length > 0) {
    // Limit to first 3 partners to avoid too many queries
    const topPartners = qsa.slice(0, 3);

    topPartners.forEach((socio: { nome?: string; nome_socio?: string; qualificacao?: string; person?: { name?: string } }) => {
      // Support both API formats
      const nomeSocio = socio.nome_socio || socio.nome || socio.person?.name;
      if (nomeSocio && razaoSocial) {
        allDorks.push({
          category: 'partners',
          query: `"${nomeSocio}" "${razaoSocial}"`,
          description: `Partner: ${nomeSocio}`
        });

        // LinkedIn for partners
        allDorks.push({
          category: 'partners',
          query: `"${nomeSocio}" site:linkedin.com`,
          description: `Partner LinkedIn: ${nomeSocio}`
        });
      }
    });
  }

  // OSINT-BRAZUCA Enhanced Dorks — Government Sanctions & Compliance
  if (includeCategory('government')) {
    if (cnpj) {
      allDorks.push({
        category: 'government',
        query: `"${cnpj}" site:portaldatransparencia.gov.br/sancoes`,
        description: 'CEIS/CNEP sanctions check'
      });

      allDorks.push({
        category: 'government',
        query: `"${cnpj}" site:pncp.gov.br`,
        description: 'PNCP public procurement records'
      });

      allDorks.push({
        category: 'government',
        query: `"${cnpj}" site:gov.br filetype:pdf`,
        description: 'Government PDF documents'
      });
    }

    if (razaoSocial) {
      allDorks.push({
        category: 'government',
        query: `"${razaoSocial}" site:in.gov.br`,
        description: 'Diário Oficial da União mentions'
      });
    }
  }

  // OSINT-BRAZUCA Enhanced Dorks — Legal & Compliance
  if (includeCategory('legal')) {
    if (cnpj) {
      allDorks.push({
        category: 'legal',
        query: `"${cnpj}" site:escavador.com`,
        description: 'Escavador legal case search'
      });
    }

    if (razaoSocial) {
      allDorks.push({
        category: 'legal',
        query: `"${razaoSocial}" site:*.trf*.jus.br`,
        description: 'Federal Regional Tribunals (TRFs)'
      });

      allDorks.push({
        category: 'legal',
        query: `"${razaoSocial}" site:consumidor.gov.br`,
        description: 'Consumer complaints (Consumidor.gov.br)'
      });

      allDorks.push({
        category: 'legal',
        query: `"${razaoSocial}" site:procon.sp.gov.br`,
        description: 'PROCON-SP complaints'
      });
    }
  }

  // OSINT-BRAZUCA Enhanced Dorks — Reputation & News  
  if (includeCategory('news')) {
    if (razaoSocial || nomeFantasia) {
      const nome = nomeFantasia || razaoSocial;
      allDorks.push({
        category: 'news',
        query: `"${nome}" site:reclameaqui.com.br`,
        description: 'Reclame Aqui reputation'
      });
    }
  }

  // OSINT-BRAZUCA Enhanced Dorks — Partner Background
  if (includeCategory('partners') && qsa && qsa.length > 0) {
    const topPartners = qsa.slice(0, 2);
    topPartners.forEach((socio: { nome?: string; nome_socio?: string; qualificacao?: string; person?: { name?: string } }) => {
      const nomeSocio = socio.nome_socio || socio.nome || socio.person?.name;
      if (nomeSocio) {
        allDorks.push({
          category: 'partners',
          query: `"${nomeSocio}" site:escavador.com`,
          description: `Partner legal records: ${nomeSocio}`
        });
      }
    });
  }

  // ─── SECURITY — Exposed credentials, configs, keys (from GHDB/OSINT reference) ───
  if (includeCategory('security')) {
    if (razaoSocial || nomeFantasia) {
      const nome = nomeFantasia || razaoSocial;
      allDorks.push({
        category: 'security',
        query: `"${nome}" filetype:env "DB_PASSWORD"`,
        description: 'Exposed .env files with database credentials'
      });
      allDorks.push({
        category: 'security',
        query: `"${nome}" filetype:env "API_KEY" OR "SECRET_KEY"`,
        description: 'Exposed API keys and secrets'
      });
      allDorks.push({
        category: 'security',
        query: `"${nome}" "AWS_ACCESS_KEY_ID" filetype:txt OR filetype:cfg OR filetype:env`,
        description: 'Exposed AWS cloud keys'
      });
      allDorks.push({
        category: 'security',
        query: `"${nome}" "BEGIN RSA PRIVATE KEY" filetype:txt OR filetype:key OR filetype:pem`,
        description: 'Exposed private keys (RSA/SSH)'
      });
      allDorks.push({
        category: 'security',
        query: `"${nome}" inurl:web.config filetype:config OR filetype:xml`,
        description: 'ASP.NET config files with connection strings'
      });
      allDorks.push({
        category: 'security',
        query: `"${nome}" intitle:"index of" "config.php"`,
        description: 'PHP config files in open directories'
      });
    }
  }

  // ─── DATABASES — Exposed SQL dumps, backups, data files ───
  if (includeCategory('databases')) {
    if (razaoSocial || nomeFantasia) {
      const nome = nomeFantasia || razaoSocial;
      allDorks.push({
        category: 'databases',
        query: `"${nome}" filetype:sql "INSERT INTO"`,
        description: 'SQL dump files with table data'
      });
      allDorks.push({
        category: 'databases',
        query: `"${nome}" filetype:sql "CREATE TABLE" "INSERT INTO"`,
        description: 'Full SQL schema + data dumps'
      });
      allDorks.push({
        category: 'databases',
        query: `"${nome}" filetype:bak "database" OR "db_backup"`,
        description: 'Database backup files'
      });
      allDorks.push({
        category: 'databases',
        query: `"${nome}" ext:sql intext:username intext:password`,
        description: 'SQL files with embedded credentials'
      });
      allDorks.push({
        category: 'databases',
        query: `"${nome}" filetype:csv "email" "nome" OR "cpf"`,
        description: 'Exposed CSV with personal/PII data'
      });
    }
    if (cnpj) {
      allDorks.push({
        category: 'databases',
        query: `"${cnpj}" filetype:sql OR filetype:csv OR filetype:xlsx`,
        description: 'Data exports containing CNPJ'
      });
    }
  }

  // ─── INFRASTRUCTURE — Login portals, directories, error pages ───
  if (includeCategory('infrastructure')) {
    if (razaoSocial || nomeFantasia) {
      const nome = nomeFantasia || razaoSocial;
      allDorks.push({
        category: 'infrastructure',
        query: `"${nome}" inurl:admin OR inurl:login intitle:"login"`,
        description: 'Admin login portals'
      });
      allDorks.push({
        category: 'infrastructure',
        query: `"${nome}" intitle:"index of" "parent directory"`,
        description: 'Open directory listings'
      });
      allDorks.push({
        category: 'infrastructure',
        query: `"${nome}" intitle:"index of" "backup"`,
        description: 'Backup files in open directories'
      });
      allDorks.push({
        category: 'infrastructure',
        query: `"${nome}" "Warning: mysql_fetch_array()" "on line"`,
        description: 'PHP/MySQL error pages exposing paths'
      });
      allDorks.push({
        category: 'infrastructure',
        query: `"${nome}" intitle:"Error occurred" "Stack trace"`,
        description: 'Stack trace error pages disclosing tech stack'
      });
      allDorks.push({
        category: 'infrastructure',
        query: `site:*.${nome.toLowerCase().replace(/\s+/g, '')}.com.br -www`,
        description: 'Subdomain enumeration via Google index'
      });
      allDorks.push({
        category: 'infrastructure',
        query: `"${nome}" inurl:"dev" OR inurl:"staging" OR inurl:"test" OR inurl:"homolog"`,
        description: 'Development/staging/test environments'
      });
    }
  }

  // ─── SOCIAL MEDIA — LinkedIn X-ray, Instagram, cross-platform OSINT ───
  if (includeCategory('social_media')) {
    if (razaoSocial || nomeFantasia) {
      const nome = nomeFantasia || razaoSocial;
      // LinkedIn x-ray enumeration
      allDorks.push({
        category: 'social_media',
        query: `site:linkedin.com/in/ "${nome}"`,
        description: 'LinkedIn employee profiles (x-ray)'
      });
      allDorks.push({
        category: 'social_media',
        query: `site:linkedin.com/in/ "${nome}" -intitle:"Jobs" -site:linkedin.com/jobs/`,
        description: 'LinkedIn profiles excluding job listings'
      });

      // Cross-platform social traces
      allDorks.push({
        category: 'social_media',
        query: `"${nome}" site:twitter.com | site:facebook.com | site:instagram.com`,
        description: 'Social media presence across platforms'
      });
      allDorks.push({
        category: 'social_media',
        query: `"${nome}" site:instagram.com`,
        description: 'Instagram company/brand presence'
      });
      allDorks.push({
        category: 'social_media',
        query: `"${nome}" site:glassdoor.com.br OR site:glassdoor.com`,
        description: 'Glassdoor employee reviews & ratings'
      });
    }

    // Partner social media OSINT
    if (qsa && qsa.length > 0) {
      const topPartners = qsa.slice(0, 2);
      topPartners.forEach((socio: { nome?: string; nome_socio?: string; person?: { name?: string } }) => {
        const nomeSocio = socio.nome_socio || socio.nome || socio.person?.name;
        if (nomeSocio) {
          allDorks.push({
            category: 'social_media',
            query: `"${nomeSocio}" site:linkedin.com/in/`,
            description: `Partner LinkedIn x-ray: ${nomeSocio}`
          });
          allDorks.push({
            category: 'social_media',
            query: `"${nomeSocio}" site:twitter.com | site:instagram.com | site:facebook.com`,
            description: `Partner social traces: ${nomeSocio}`
          });
        }
      });
    }
  }

  // ─── DOCUMENTS (enriched) — More file types from OSINT reference ───
  if (includeCategory('documents')) {
    if (razaoSocial) {
      allDorks.push({
        category: 'documents',
        query: `"${razaoSocial}" filetype:pdf "confidencial" OR "interno" OR "restrito"`,
        description: 'Confidential/internal documents (PT-BR)'
      });
      allDorks.push({
        category: 'documents',
        query: `"${razaoSocial}" filetype:pptx OR filetype:ppt OR filetype:docx`,
        description: 'Presentations and Word documents'
      });
      allDorks.push({
        category: 'documents',
        query: `"${razaoSocial}" "contrato" site:.gov.br filetype:pdf`,
        description: 'Government contracts in PDF'
      });
    }
    if (cnpj) {
      allDorks.push({
        category: 'documents',
        query: `"${cnpj}" filetype:pdf "balanço" OR "demonstrações financeiras"`,
        description: 'Financial statements by CNPJ'
      });
    }
  }

  // ─── NEWS (enriched) — Breach monitoring, investigative journalism ───
  if (includeCategory('news')) {
    if (razaoSocial || nomeFantasia) {
      const nome = nomeFantasia || razaoSocial;
      allDorks.push({
        category: 'news',
        query: `"${nome}" "vazamento" OR "data breach" OR "incidente"`,
        description: 'Data breach/incident mentions'
      });
      allDorks.push({
        category: 'news',
        query: `"${nome}" "investigação" OR "operação" site:gov.br OR site:mpf.mp.br`,
        description: 'Government investigations / police operations'
      });
      allDorks.push({
        category: 'news',
        query: `"${nome}" site:valor.globo.com OR site:infomoney.com.br OR site:exame.com`,
        description: 'Business/financial news outlets'
      });
    }
  }

  return allDorks;
}

// Get dorks for specific category
export function getDorksByCategory(cnpjData: CNPJData, category: DorkCategory): DorkTemplate[] {
  return buildDorks(cnpjData, [category]);
}

// Get prioritized dorks (most important first)
export function getPrioritizedDorks(cnpjData: CNPJData, maxDorks: number = 10): DorkTemplate[] {
  const allDorks = buildDorks(cnpjData);

  // Priority order
  const priority: DorkCategory[] = ['government', 'legal', 'security', 'databases', 'infrastructure', 'documents', 'news', 'social', 'social_media', 'partners'];

  const prioritized: DorkTemplate[] = [];
  for (const cat of priority) {
    const catDorks = allDorks.filter(d => d.category === cat);
    prioritized.push(...catDorks);
    if (prioritized.length >= maxDorks) break;
  }

  return prioritized.slice(0, maxDorks);
}
