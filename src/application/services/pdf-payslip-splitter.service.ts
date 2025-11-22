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
     * Divide o PDF e retorna um Map com nome do colaborador e Buffer do PDF individual
     */
    async splitPayslipsByEmployee(
      pdfBuffer: Buffer,
      colaboradores: Colaborador[]
    ): Promise<Map<string, Buffer>> {
      const results = await this.splitPayslipPdf(pdfBuffer, colaboradores);
      const map = new Map<string, Buffer>();
      for (const result of results) {
        map.set(result.colaborador.nome, result.pdfBuffer);
      }
      return map;
    }
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
      const data = await (pdfParse as any)(pdfBuffer, {
        pagerender: (pageData: any) => {
          if (pageData.pageIndex === pageIndex) {
            return pageData.getTextContent();
          }
          return null;
        }
      });
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
      import * as pdfParse from 'pdf-parse';
      import { PDFDocument } from 'pdf-lib';

      interface Employee {
        nome: string;
        email: string;
        unidade: string;
      }

      export class PdfPayslipSplitterService {
        /**
         * Divide um PDF com múltiplos holerites em arquivos individuais
         */
        async splitPayslipPdf(
          pdfBuffer: Buffer,
          employees: Employee[]
        ): Promise<Map<string, Buffer>> {
          const result = new Map<string, Buffer>();

          try {
            console.log('[PDF Splitter] Iniciando divisão do PDF');
      
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const totalPages = pdfDoc.getPageCount();
      
            console.log(`[PDF Splitter] Total de páginas: ${totalPages}`);
            console.log(`[PDF Splitter] Colaboradores na unidade: ${employees.length}`);

            // Tentar detectar nomes nas páginas
            const pageNames: string[] = [];
      
            for (let i = 0; i < totalPages; i++) {
              console.log(`[PDF Splitter] Processando página ${i + 1}/${totalPages}`);
        
              const pageText = await this.extractTextFromPage(pdfBuffer, i);
              const foundName = this.findEmployeeName(pageText, employees);
        
              if (foundName) {
                pageNames.push(foundName);
                console.log(`[PDF Splitter] Nome encontrado na página ${i + 1}: ${foundName}`);
              } else {
                console.log(`[PDF Splitter] Nome não encontrado na página ${i + 1}`);
                pageNames.push(''); // Marca página sem nome identificado
              }
            }

            // Criar PDFs individuais
            for (let i = 0; i < totalPages; i++) {
              const employeeName = pageNames[i];
        
              if (!employeeName) {
                console.log(`[PDF Splitter] Pulando página ${i + 1} - sem nome identificado`);
                continue;
              }

              try {
                const newPdf = await PDFDocument.create();
                const [page] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(page);
          
                const pdfBytes = await newPdf.save();
                result.set(employeeName, Buffer.from(pdfBytes));
          
                console.log(`[PDF Splitter] ✅ PDF criado para: ${employeeName}`);
              } catch (error: any) {
                console.error(`[PDF Splitter] Erro ao criar PDF para ${employeeName}:`, error.message);
              }
            }

            console.log(`[PDF Splitter] Concluído: ${result.size} PDFs individuais criados`);
            return result;

          } catch (error: any) {
            console.error('[PDF Splitter] Erro ao processar PDF:', error);
            throw new Error(`Falha ao dividir PDF: ${error.message}`);
          }
        }

        /**
         * Extrai texto de uma página específica do PDF
         */
        private async extractTextFromPage(buffer: Buffer, pageIndex: number): Promise<string> {
          try {
            const pdfDoc = await PDFDocument.load(buffer);
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
            newPdf.addPage(page);
      
            const pdfBytes = await newPdf.save();
      
            // CORREÇÃO: Usar pdfParse corretamente
            const data = await (pdfParse as any)(Buffer.from(pdfBytes));
      
            return data.text;
          } catch (error: any) {
            console.error(`[PDF Splitter] Erro ao extrair texto da página ${pageIndex}:`, error);
            return '';
          }
        }

        /**
         * Busca o nome do colaborador no texto da página
         */
        private findEmployeeName(pageText: string, employees: Employee[]): string | null {
          const normalizedText = this.normalizeText(pageText);
    
          for (const employee of employees) {
            const normalizedName = this.normalizeText(employee.nome);
      
            // Buscar nome completo
            if (normalizedText.includes(normalizedName)) {
              return employee.nome;
            }
      
            // Buscar partes significativas do nome (sobrenome)
            const nameParts = normalizedName.split(' ').filter(part => part.length > 3);
            for (const part of nameParts) {
              if (normalizedText.includes(part)) {
                return employee.nome;
              }
            }
          }
    
          return null;
        }

        /**
         * Normaliza texto para comparação (remove acentos, converte para minúsculas)
         */
        private normalizeText(text: string): string {
          return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^\w\s]/g, ' ') // Remove pontuação
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
        }
      }
