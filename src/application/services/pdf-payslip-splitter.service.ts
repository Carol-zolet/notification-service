import * as pdfParse from 'pdf-parse';
import { PDFDocument } from 'pdf-lib';

interface Employee {
  nome: string;
  email: string;
  unidade: string;
}

export class PdfPayslipSplitterService {
  async splitPayslipPdf(pdfBuffer: Buffer, employees: Employee[]): Promise<Map<string, Buffer>> {
    const result = new Map<string, Buffer>();

    try {
      console.log('[PDF Splitter] Iniciando divisão do PDF');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      console.log(`[PDF Splitter] Total de páginas: ${totalPages}`);
      console.log(`[PDF Splitter] Colaboradores na unidade: ${employees.length}`);

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
          pageNames.push('');
        }
      }

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

  private async extractTextFromPage(buffer: Buffer, pageIndex: number): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(page);
      
      const pdfBytes = await newPdf.save();
      const data = await (pdfParse as any)(Buffer.from(pdfBytes));
      
      return data.text;
    } catch (error: any) {
      console.error(`[PDF Splitter] Erro ao extrair texto da página ${pageIndex}:`, error);
      return '';
    }
  }

  private findEmployeeName(pageText: string, employees: Employee[]): string | null {
    const normalizedText = this.normalizeText(pageText);
    
    for (const employee of employees) {
      const normalizedName = this.normalizeText(employee.nome);
      
      if (normalizedText.includes(normalizedName)) {
        return employee.nome;
      }
      
      const nameParts = normalizedName.split(' ').filter(part => part.length > 3);
      for (const part of nameParts) {
        if (normalizedText.includes(part)) {
          return employee.nome;
        }
      }
    }
    
    return null;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036F]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, ' ') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
  }
}
