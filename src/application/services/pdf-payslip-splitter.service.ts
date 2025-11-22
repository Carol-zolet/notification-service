import { PDFDocument } from 'pdf-lib';
import * as pdfParse from 'pdf-parse';

interface Colaborador {
  nome: string;
  email: string;
  unidade: string;
}

interface SplitResult {
  colaborador: Colaborador;
  pdfBuffer: Buffer;
}

export class PdfPayslipSplitterService {
  /**
   * Divide um PDF com múltiplos holerites (2 por página) em PDFs individuais
   */
  async splitPayslipPdf(
    pdfBuffer: Buffer,
    colaboradores: Colaborador[]
  ): Promise<SplitResult[]> {
    try {
      // Carregar o PDF original
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      console.log(`[PDF Splitter] Total de páginas: ${totalPages}`);
      console.log(`[PDF Splitter] Colaboradores na unidade: ${colaboradores.length}`);

      const results: SplitResult[] = [];

      // Processar cada página
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        console.log(`[PDF Splitter] Processando página ${pageIndex + 1}/${totalPages}`);

        // Extrair nomes da página usando OCR de texto
        const pageText = await this.extractTextFromPage(pdfBuffer, pageIndex);
        const names = this.extractNamesFromText(pageText);

        console.log(`[PDF Splitter] Nomes encontrados na página ${pageIndex + 1}:`, names);

        // Dividir a página em 2 metades (superior e inferior)
        const isLastPage = pageIndex === totalPages - 1;
        const hasOnlyOnePayslip = isLastPage && colaboradores.length % 2 !== 0;
        const splitsPerPage = hasOnlyOnePayslip ? 1 : 2;

        for (let splitIndex = 0; splitIndex < splitsPerPage; splitIndex++) {
          const name = names[splitIndex];
          if (!name) {
            console.warn(`[PDF Splitter] Nome não encontrado para split ${splitIndex + 1} da página ${pageIndex + 1}`);
            continue;
          }

          // Buscar colaborador pelo nome
          const colaborador = this.findColaboradorByName(name, colaboradores);
          if (!colaborador) {
            console.warn(`[PDF Splitter] Colaborador não encontrado para o nome: ${name}`);
            continue;
          }

          // Criar PDF individual com a metade correspondente
          const individualPdf = await this.createIndividualPdf(
            pdfDoc,
            pageIndex,
            splitIndex,
            hasOnlyOnePayslip
          );

          results.push({
            colaborador,
            pdfBuffer: individualPdf,
          });

          console.log(`[PDF Splitter] ✓ PDF criado para ${colaborador.nome} (${colaborador.email})`);
        }
      }

      console.log(`[PDF Splitter] Concluído: ${results.length} PDFs individuais criados`);
      return results;

    } catch (error: any) {
      console.error('[PDF Splitter] Erro ao dividir PDF:', error);
      throw new Error(`Falha ao dividir PDF: ${error.message}`);
    }
  }

  /**
   * Extrai texto de uma página específica do PDF
   */
  private async extractTextFromPage(pdfBuffer: Buffer, pageIndex: number): Promise<string> {
    try {
      const data = await (pdfParse.default ? pdfParse.default(pdfBuffer, {
        pagerender: (pageData: any) => {
          // Filtrar apenas a página desejada
          if (pageData.pageIndex === pageIndex) {
            return pageData.getTextContent();
          }
          return null;
        }
      }) : pdfParse(pdfBuffer, {
        pagerender: (pageData: any) => {
          // Filtrar apenas a página desejada
          if (pageData.pageIndex === pageIndex) {
            return pageData.getTextContent();
          }
          return null;
        }
      }));
      return data.text || '';
    } catch (error) {
      console.error(`[PDF Splitter] Erro ao extrair texto da página ${pageIndex}:`, error);
      return '';
    }
  }

  /**
   * Extrai nomes de colaboradores do texto
   * Procura por padrão: "número + Nome Completo"
   * Exemplo: "29 Caroline Zolet"
   */
  private extractNamesFromText(text: string): string[] {
    const names: string[] = [];
    
    // Padrão: número seguido de nome (2-4 palavras capitalizadas)
    const namePattern = /^\s*\d+\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,3})/gm;
    
    const matches = text.matchAll(namePattern);
    for (const match of matches) {
      if (match[1]) {
        const name = match[1].trim();
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Busca colaborador por nome (fuzzy matching)
   */
  private findColaboradorByName(name: string, colaboradores: Colaborador[]): Colaborador | null {
    const normalizedSearchName = this.normalizeName(name);

    // Busca exata
    for (const colab of colaboradores) {
      const normalizedColabName = this.normalizeName(colab.nome);
      if (normalizedColabName === normalizedSearchName) {
        return colab;
      }
    }

    // Busca parcial (pelo menos 70% de similaridade)
    for (const colab of colaboradores) {
      const normalizedColabName = this.normalizeName(colab.nome);
      const similarity = this.calculateSimilarity(normalizedSearchName, normalizedColabName);
      if (similarity > 0.7) {
        console.log(`[PDF Splitter] Match parcial: "${name}" -> "${colab.nome}" (${Math.round(similarity * 100)}%)`);
        return colab;
      }
    }

    return null;
  }

  /**
   * Normaliza nome para comparação
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z\s]/g, '') // Remove caracteres especiais
      .trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }


  /**
   * Cria PDF individual a partir de uma metade da página
   */
  private async createIndividualPdf(
    originalPdf: PDFDocument,
    pageIndex: number,
    splitIndex: number,
    isOnlyOne: boolean
  ): Promise<Buffer> {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(originalPdf, [pageIndex]);
    
    const { height } = page.getSize();
    
    if (!isOnlyOne) {
      // Dividir página ao meio
      if (splitIndex === 0) {
        // Metade superior - cortar a parte de baixo
        page.setCropBox(0, height / 2, page.getWidth(), height);
      } else {
        // Metade inferior - cortar a parte de cima
        page.setCropBox(0, 0, page.getWidth(), height / 2);
      }
    }
    
    newPdf.addPage(page);
    
    const pdfBytes = await newPdf.save();
    return Buffer.from(pdfBytes);
  }
}
