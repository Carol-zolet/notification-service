import { PDFDocument } from 'pdf-lib';
import * as pdfParse from 'pdf-parse';

export interface SplitPayslip {
  nome: string;
  pdfBuffer: Buffer;
  pageNumber: number;
  position: 'superior' | 'inferior';
}

export class PdfSplitterService {
  private extractNome(text: string): string | null {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      if (line.length < 5 || line.length > 60) continue;
      if (/\d|R\$|CPF|CNPJ|INSS|FGTS|Salário|Desconto|Código|Referência/i.test(line)) continue;
      const words = line.split(/\s+/).filter(w => w.length > 0);
      if (words.length >= 2 && /^[A-Za-zÀ-ÿ\s]+$/.test(line)) {
        return line.toUpperCase();
      }
    }
    return null;
  }

  private splitPageText(fullText: string): { superior: string; inferior: string } {
    const lines = fullText.split('\n');
    const midPoint = Math.floor(lines.length / 2);
    return {
      superior: lines.slice(0, midPoint).join('\n'),
      inferior: lines.slice(midPoint).join('\n')
    };
  }

  private async createSinglePagePdf(
    sourcePdf: PDFDocument,
    pageIndex: number,
    cropToHalf: 'superior' | 'inferior' | null = null
  ): Promise<Buffer> {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageIndex]);
    if (cropToHalf) {
      const { height } = copiedPage.getSize();
      const halfHeight = height / 2;
      if (cropToHalf === 'superior') {
        copiedPage.setCropBox(0, halfHeight, copiedPage.getWidth(), height);
      } else {
        copiedPage.setCropBox(0, 0, copiedPage.getWidth(), halfHeight);
      }
    }
    newPdf.addPage(copiedPage);
    const pdfBytes = await newPdf.save();
    return Buffer.from(pdfBytes);
  }

  async splitBatchPdf(pdfBuffer: Buffer): Promise<SplitPayslip[]> {
    const payslips: SplitPayslip[] = [];
    try {
      console.log('📄 Analisando PDF...');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      console.log(`📄 PDF com ${totalPages} páginas (${totalPages * 2} holerites esperados)`);
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        console.log(`\n🔍 Processando página ${pageIndex + 1}/${totalPages}...`);
        const singlePagePdf = await this.createSinglePagePdf(pdfDoc, pageIndex);
        const pageData = await (pdfParse as any).default(singlePagePdf);
        const pageText = pageData.text;
        const { superior, inferior } = this.splitPageText(pageText);
        const nomeSuperior = this.extractNome(superior);
        if (nomeSuperior) {
          const pdfSuperior = await this.createSinglePagePdf(pdfDoc, pageIndex, 'superior');
          payslips.push({ nome: nomeSuperior, pdfBuffer: pdfSuperior, pageNumber: pageIndex + 1, position: 'superior' });
          console.log(`  ✅ Superior: ${nomeSuperior}`);
        } else {
          console.log(`  ⚠️  Superior: Nome não encontrado`);
        }
        const nomeInferior = this.extractNome(inferior);
        if (nomeInferior) {
          const pdfInferior = await this.createSinglePagePdf(pdfDoc, pageIndex, 'inferior');
          payslips.push({ nome: nomeInferior, pdfBuffer: pdfInferior, pageNumber: pageIndex + 1, position: 'inferior' });
          console.log(`  ✅ Inferior: ${nomeInferior}`);
        } else {
          console.log(`  ⚠️  Inferior: Nome não encontrado`);
        }
      }
      console.log(`\n✅ Total: ${payslips.length} holerites separados`);
    } catch (error) {
      console.error('❌ Erro ao processar PDF:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao separar PDF em lote: ${msg}`);
    }
    return payslips;
  }
}