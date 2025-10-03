/**
 * Dork Templates - Automatic Google Dorks generation based on CNPJ data
 */

export type DorkCategory = 'government' | 'legal' | 'news' | 'documents' | 'social' | 'partners';

export interface DorkTemplate {
  category: DorkCategory;
  query: string;
  description: string;
}

export function buildDorks(cnpjData: any, categories?: DorkCategory[]): DorkTemplate[] {
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
    
    topPartners.forEach((socio: any) => {
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

  return allDorks;
}

// Get dorks for specific category
export function getDorksByCategory(cnpjData: any, category: DorkCategory): DorkTemplate[] {
  return buildDorks(cnpjData, [category]);
}

// Get prioritized dorks (most important first)
export function getPrioritizedDorks(cnpjData: any, maxDorks: number = 10): DorkTemplate[] {
  const allDorks = buildDorks(cnpjData);
  
  // Priority order
  const priority: DorkCategory[] = ['government', 'legal', 'documents', 'news', 'social', 'partners'];
  
  const prioritized: DorkTemplate[] = [];
  for (const cat of priority) {
    const catDorks = allDorks.filter(d => d.category === cat);
    prioritized.push(...catDorks);
    if (prioritized.length >= maxDorks) break;
  }
  
  return prioritized.slice(0, maxDorks);
}
