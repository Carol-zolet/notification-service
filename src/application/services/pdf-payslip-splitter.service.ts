import { PDFDocument } from 'pdf-lib';

interface Employee {
  nome: string;
  email: string;
  unidade: string;
}

interface PayslipPosition {
  employeeName: string;
  position: 'top' | 'bottom';
}

export class PdfPayslipSplitterService {
  private pdfjsLib: any;

  constructor() {
    // Importação dinâmica do pdfjs-dist
    try {
      this.pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      console.log('[PDF Splitter] ✓ pdfjs-dist carregado com sucesso');
    } catch (error) {
      console.error('[PDF Splitter] ❌ Erro ao carregar pdfjs-dist:', error);
      throw new Error('pdfjs-dist não está instalado');
    }
  }
  async splitPayslipPdf(pdfBuffer: Buffer, employees: Employee[]): Promise<Map<string, Buffer>> {
    const result = new Map<string, Buffer>();

    try {
      console.log('[PDF Splitter] Iniciando divisão do PDF');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      
      console.log(`[PDF Splitter] Total de páginas: ${totalPages}`);
      console.log(`[PDF Splitter] Colaboradores na unidade: ${employees.length}`);
      console.log(`[PDF Splitter] Esperados ${totalPages * 2} holerites (2 por página)`);

      // Array para armazenar os nomes encontrados em cada página
      const pagePayslips: PayslipPosition[][] = [];
      
      // Extrair nomes de cada página (2 holerites por página)
      for (let i = 0; i < totalPages; i++) {
        console.log(`[PDF Splitter] Processando página ${i + 1}/${totalPages}`);
        const pageText = await this.extractTextFromPage(pdfBuffer, i);
        const foundNames = this.findTwoEmployeeNames(pageText, employees);
        
        pagePayslips.push(foundNames);
        
        if (foundNames.length > 0) {
          foundNames.forEach(payslip => {
            console.log(`[PDF Splitter] ✓ Nome encontrado na página ${i + 1} (${payslip.position}): ${payslip.employeeName}`);
          });
        } else {
          console.log(`[PDF Splitter] ⚠ Nenhum nome encontrado na página ${i + 1}`);
        }
      }

      // Gerar PDFs individuais
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const payslipsInPage = pagePayslips[pageIndex];
        
        if (payslipsInPage.length === 0) {
          console.log(`[PDF Splitter] Pulando página ${pageIndex + 1} - sem nomes identificados`);
          continue;
        }

        // Processar cada holerite encontrado na página
        for (const payslip of payslipsInPage) {
          try {
            // Criar PDF com a página cortada (metade superior ou inferior)
            const croppedPdf = await this.createCroppedPdf(pdfDoc, pageIndex, payslip.position);
            result.set(payslip.employeeName, croppedPdf);
            
            console.log(`[PDF Splitter] ✅ PDF criado para: ${payslip.employeeName} (${payslip.position})`);
          } catch (error: any) {
            console.error(`[PDF Splitter] ❌ Erro ao criar PDF para ${payslip.employeeName}:`, error.message);
          }
        }
      }

      console.log(`[PDF Splitter] ✅ Concluído: ${result.size} PDFs individuais criados de ${totalPages * 2} esperados`);
      return result;
    } catch (error: any) {
      console.error('[PDF Splitter] ❌ Erro ao processar PDF:', error);
      throw new Error(`Falha ao dividir PDF: ${error.message}`);
    }
  }

  /**
   * Extrai texto da página usando pdfjs-dist
   */
  private async extractTextFromPage(buffer: Buffer, pageIndex: number): Promise<string> {
    try {
      // Criar um PDF temporário com apenas a página desejada
      const pdfDoc = await PDFDocument.load(buffer);
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(page);
      
      const pdfBytes = await newPdf.save();
      
      // Usar pdfjs-dist para extrair o texto
      const loadingTask = this.pdfjsLib.getDocument({
        data: new Uint8Array(pdfBytes),
        useSystemFonts: true,
        standardFontDataUrl: null,
      });
      
      const pdfDocument = await loadingTask.promise;
      const page1 = await pdfDocument.getPage(1);
      const textContent = await page1.getTextContent();
      
      // Extrair todo o texto
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      console.log(`[PDF Splitter] Texto extraído da página ${pageIndex + 1}: ${text.length} caracteres`);
      
      return text;
    } catch (error: any) {
      console.error(`[PDF Splitter] Erro ao extrair texto da página ${pageIndex}:`, error.message);
      return '';
    }
  }

  /**
   * Busca DOIS nomes de colaboradores em uma página (metade superior e inferior)
   */
  private findTwoEmployeeNames(pageText: string, employees: Employee[]): PayslipPosition[] {
    const result: PayslipPosition[] = [];
    
    if (!pageText || pageText.length < 50) {
      console.log('[PDF Splitter] ⚠ Texto muito curto, pulando divisão');
      return result;
    }
    
    // Dividir o texto ao meio (aproximadamente)
    const midPoint = Math.floor(pageText.length / 2);
    const topHalf = pageText.substring(0, midPoint);
    const bottomHalf = pageText.substring(midPoint);
    
    console.log(`[PDF Splitter] Dividindo texto: ${topHalf.length} chars (top) + ${bottomHalf.length} chars (bottom)`);
    
    // Buscar nome na metade superior
    const topName = this.findEmployeeName(topHalf, employees);
    if (topName) {
      result.push({ employeeName: topName, position: 'top' });
    } else {
      console.log('[PDF Splitter] ⚠ Nome não encontrado na metade superior');
    }
    
    // Buscar nome na metade inferior
    const bottomName = this.findEmployeeName(bottomHalf, employees);
    if (bottomName) {
      result.push({ employeeName: bottomName, position: 'bottom' });
    } else {
      console.log('[PDF Splitter] ⚠ Nome não encontrado na metade inferior');
    }
    
    return result;
  }

  /**
   * Busca um nome de colaborador no texto
   */
  private findEmployeeName(text: string, employees: Employee[]): string | null {
    const normalizedText = this.normalizeText(text);
    
    // Primeiro: busca por nome completo
    for (const employee of employees) {
      const normalizedName = this.normalizeText(employee.nome);
      
      if (normalizedText.includes(normalizedName)) {
        return employee.nome;
      }
    }
    
    // Segundo: busca por partes do nome (sobrenomes significativos)
    for (const employee of employees) {
      const normalizedName = this.normalizeText(employee.nome);
      const nameParts = normalizedName.split(' ').filter(part => part.length > 3);
      
      // Precisa encontrar pelo menos 2 partes do nome para confirmar
      let matches = 0;
      for (const part of nameParts) {
        if (normalizedText.includes(part)) {
          matches++;
        }
      }
      
      if (matches >= 2 || (nameParts.length === 1 && matches === 1)) {
        return employee.nome;
      }
    }
    
    return null;
  }

  /**
   * Cria um PDF com apenas a metade da página (superior ou inferior)
   */
  private async createCroppedPdf(
    pdfDoc: PDFDocument, 
    pageIndex: number, 
    position: 'top' | 'bottom'
  ): Promise<Buffer> {
    const newPdf = await PDFDocument.create();
    const [originalPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    
    // Obter dimensões da página
    const { width, height } = originalPage.getSize();
    const halfHeight = height / 2;
    
    // Ajustar o CropBox para mostrar apenas a metade desejada
    if (position === 'top') {
      // Metade superior: manter os Y de halfHeight até height
      originalPage.setCropBox(0, halfHeight, width, height);
    } else {
      // Metade inferior: manter os Y de 0 até halfHeight
      originalPage.setCropBox(0, 0, width, halfHeight);
    }
    
    newPdf.addPage(originalPage);
    
    const pdfBytes = await newPdf.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Normaliza texto removendo acentos, pontuação e espaços extras
   */
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
