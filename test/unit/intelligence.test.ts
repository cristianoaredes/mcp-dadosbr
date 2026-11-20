import { describe, it, expect } from 'vitest';
import {
  normalizeCnpj,
  containsCnpj,
  filterResultsByCnpj,
} from '../../lib/core/intelligence.js';
import type { SearchResult } from '../../lib/core/search-providers.js';

describe('Intelligence - CNPJ Filtering (lib/core/intelligence)', () => {
  const testCnpj = '12345678000190';
  const formattedCnpj = '12.345.678/0001-90';

  describe('containsCnpj - True Positives', () => {
    it('should match unformatted CNPJ in text', () => {
      const text = 'Company CNPJ: 12345678000190 is registered';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match formatted CNPJ in text', () => {
      const text = 'Company CNPJ: 12.345.678/0001-90 is registered';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match formatted CNPJ when given formatted input', () => {
      const text = 'CNPJ 12.345.678/0001-90 encontrado';
      expect(containsCnpj(text, formattedCnpj)).toBe(true);
    });

    it('should match CNPJ at start of text', () => {
      const text = '12345678000190 - Company Name';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match CNPJ at end of text', () => {
      const text = 'Registered under CNPJ 12345678000190';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match CNPJ with surrounding punctuation', () => {
      const text = 'CNPJ: 12345678000190.';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match CNPJ in URL', () => {
      const text = 'https://example.com/empresa/12345678000190';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should be case insensitive for surrounding text', () => {
      const text = 'cnpj: 12.345.678/0001-90 CNPJ';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });
  });

  describe('containsCnpj - True Negatives (Avoiding False Positives)', () => {
    it('should NOT match CNPJ with extra digits before', () => {
      const text = 'Invalid: 912345678000190';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match CNPJ with extra digits after', () => {
      const text = 'Invalid: 123456780001901';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match CNPJ embedded in longer number', () => {
      const text = 'Wrong: 99123456780001909';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match partial CNPJ', () => {
      const text = 'Partial: 1234567800019';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match different CNPJ', () => {
      const text = 'Different CNPJ: 98765432000100';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match when no CNPJ present', () => {
      const text = 'This text contains no CNPJ at all';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match empty text', () => {
      const text = '';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match CNPJ with different formatting style', () => {
      const text = 'Wrong format: 12-345-678-0001-90';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });
  });

  describe('containsCnpj - Edge Cases', () => {
    it('should handle CNPJ with spaces before/after', () => {
      const text = 'CNPJ  12345678000190  registered';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should handle multiple CNPJs in text (matching ours)', () => {
      const text = 'CNPJs: 98765432000100, 12345678000190, 11111111000111';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should handle multiple CNPJs in text (not matching ours)', () => {
      const text = 'CNPJs: 98765432000100, 11111111000111';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should handle text with newlines', () => {
      const text = 'Company Info:\nCNPJ: 12345678000190\nStatus: Active';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should handle CNPJ in HTML-like content', () => {
      const text = '<div>CNPJ: <span>12.345.678/0001-90</span></div>';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should normalize input CNPJ before matching', () => {
      const text = 'CNPJ 12345678000190';
      expect(containsCnpj(text, formattedCnpj)).toBe(true);
    });
  });

  describe('normalizeCnpj', () => {
    it('should remove all non-digit characters', () => {
      expect(normalizeCnpj('12.345.678/0001-90')).toBe('12345678000190');
    });

    it('should handle already normalized CNPJ', () => {
      expect(normalizeCnpj('12345678000190')).toBe('12345678000190');
    });

    it('should handle CNPJ with various separators', () => {
      expect(normalizeCnpj('12-345-678-0001-90')).toBe('12345678000190');
    });

    it('should handle empty string', () => {
      expect(normalizeCnpj('')).toBe('');
    });
  });

  describe('filterResultsByCnpj', () => {
    it('filters search results by title, URL, or snippet containing target CNPJ', () => {
      const results: SearchResult[] = [
        {
          title: 'Ficha 12.345.678/0001-90',
          url: 'https://example.com/a',
          snippet: 'Empresa cadastrada',
        },
        {
          title: 'Processo',
          url: 'https://example.com/empresa/12345678000190',
          snippet: 'Diario oficial',
        },
        {
          title: 'Edital',
          url: 'https://example.com/b',
          snippet: 'Contrato CNPJ: 12345678000190 homologado',
        },
        {
          title: 'Outra empresa',
          url: 'https://example.com/c',
          snippet: 'CNPJ: 98.765.432/0001-00 e numero 123456780001909',
        },
      ];

      const filtered = filterResultsByCnpj(results, formattedCnpj);
      expect(filtered).toHaveLength(3);
      expect(filtered.map((r) => r.url)).toEqual([
        'https://example.com/a',
        'https://example.com/empresa/12345678000190',
        'https://example.com/b',
      ]);
    });
  });

  describe('Real-world scenarios', () => {
    it('should match CNPJ in government portal URL', () => {
      const text = 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp?cnpj=12345678000190';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match CNPJ in legal document snippet', () => {
      const text = 'A empresa XYZ Ltda., inscrita no CNPJ sob o nº 12.345.678/0001-90, estabelecida...';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should match CNPJ in news article', () => {
      const text = 'The company (CNPJ: 12345678000190) announced today...';
      expect(containsCnpj(text, testCnpj)).toBe(true);
    });

    it('should NOT match when only company name is mentioned', () => {
      const text = 'XYZ Company announced new product launch';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });

    it('should NOT match similar but different numbers', () => {
      const text = 'Invoice #123456780001901 for customer 12345678000199';
      expect(containsCnpj(text, testCnpj)).toBe(false);
    });
  });
});
