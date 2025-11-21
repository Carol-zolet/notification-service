import { PDFDocument } from 'pdf-lib';
import * as pdfParse from 'pdf-parse';

export interface SplitPageResult {
  pageNumber: number;
  pdfBuffer: Buffer;
  text: string;
}

export interface PayslipMatch {
  cpf: string;
  nome?: string;
  pdfBuffer: Buffer;
  pageNumber: number;
  position: 'superior' | 'inferior';
}

export class PdfSplitterService {
  /**
   * Divide um PDF em páginas individuais e extrai o texto de cada uma
   * @param pdfBuffer Buffer do PDF original
   * @returns Array com informações de cada página
   */
  async splitPdfIntoPages(pdfBuffer: Buffer): Promise<SplitPageResult[]> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      console.log(`📄 PDF possui ${totalPages} páginas. Iniciando divisão...`);

      const results: SplitPageResult[] = [];

      for (let i = 0; i < totalPages; i++) {
        const newPdfDoc = await PDFDocument.create();
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
        newPdfDoc.addPage(copiedPage);

        const pdfBytes = await newPdfDoc.save();
        const pageBuffer = Buffer.from(pdfBytes);

        const pageData = await pdfParse(pageBuffer);
        const text = pageData.text;

        results.push({
          pageNumber: i + 1,
          pdfBuffer: pageBuffer,
          text: text,
        });

        console.log(`✅ Página ${i + 1}/${totalPages} processada`);
      }

      return results;
    } catch (error) {
      console.error('❌ Erro ao dividir PDF:', error);
      throw new Error(`Falha ao dividir PDF: ${error.message}`);
    }
  }

  /**
   * Extrai CPFs do texto usando regex
   */
  private extractCPFs(text: string): string[] {
    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
    const matches = text.match(cpfRegex) || [];
    return matches.map(cpf => cpf.replace(/[^\d]/g, '')); // Remove pontuação
  }

  /**
   * /**
   * Extrai nome do texto do PDF
   * Procura por padrões como "Nome:", "Funcionário:", etc.
   */
  private extractNome(text: string): string | null {
    // Padrões comuns para identificar o nome
    const patterns = [
      /Nome[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]+)/i,
      /Funcion[aá]rio[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]+)/i,
      /Colaborador[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]+)/i,
      /Empregado[:\s]+([A-ZÀ-Ú][A-ZÀ-Ú\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Limpa o nome (remove quebras de linha, espaços extras)
        const nome = match[1]
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();
        
        // Valida se tem pelo menos 2 palavras (nome e sobrenome)
        if (nome.split(' ').length >= 2) {
          return nome;
        }
      }
    }

    return null;
   }

  /**
   * Processa PDF e separa por colaborador usando CPF
   */
  async separateByColaborador(pdfBuffer: Buffer): Promise<PayslipMatch[]> {
    const payslips: PayslipMatch[] = [];

    try {
      const pages = await this.splitPdfIntoPages(pdfBuffer);

      console.log(`\n🔍 Analisando ${pages.length} páginas para extrair CPFs...`);

      for (const page of pages) {
        const cpfs = this.extractCPFs(page.text);

        if (cpfs.length === 0) {
          console.warn(`⚠️ Página ${page.pageNumber}: Nenhum CPF encontrado`);
          continue;
        }

        if (cpfs.length === 1) {
          // Uma página = um colaborador
          const cpf = cpfs[0];
          const nome = this.extractNomeProximoCPF(page.text, cpf);
          
          payslips.push({
            cpf,
            nome: nome || undefined,
            pdfBuffer: page.pdfBuffer,
            pageNumber: page.pageNumber,
            position: 'superior',
          });

          console.log(`✅ Página ${page.pageNumber}: CPF ${cpf} encontrado`);
        } else if (cpfs.length === 2) {
          // Duas páginas na mesma folha (frente e verso)
          console.log(`📑 Página ${page.pageNumber}: 2 CPFs encontrados (dividindo...)`);
          
          for (let cpfIndex = 0; cpfIndex < cpfs.length; cpfIndex++) {
            const cpf = cpfs[cpfIndex];
            const nome = this.extractNomeProximoCPF(page.text, cpf);
            
            payslips.push({
              cpf,
              nome: nome || undefined,
              pdfBuffer: page.pdfBuffer,
              pageNumber: page.pageNumber,
              position: cpfIndex === 0 ? 'superior' : 'inferior',
            });
          }
        } else {
          console.warn(`⚠️ Página ${page.pageNumber}: ${cpfs.length} CPFs encontrados (esperado 1 ou 2)`);
        }
      }

      console.log(`\n✅ Total de holerites identificados: ${payslips.length}`);
      return payslips;
    } catch (error) {
      console.error('❌ Erro ao separar por colaborador:', error);
      throw error;
    }
  }
}