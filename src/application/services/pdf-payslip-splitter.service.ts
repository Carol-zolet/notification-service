import { PDFDocument } from 'pdf-lib';

interface Employee {
  nome: string;
  email: string;
  unidade: string;
}

type MatchConfidence = 'exact' | 'fuzzy';

interface NameMatch {
  employeeName: string;
  confidence: MatchConfidence;
}

interface PayslipPosition {
  employeeName: string;
  position: 'top' | 'bottom';
  confidence: MatchConfidence;
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
    const matchesFracos: string[] = []; // pra reportar no final, mesmo sem bloquear o envio

    try {
      console.log('[PDF Splitter] Iniciando divisão do PDF');
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      console.log(`[PDF Splitter] Total de páginas: ${totalPages}`);
      console.log(`[PDF Splitter] Colaboradores na unidade: ${employees.length}`);
      console.log(`[PDF Splitter] Esperados ${totalPages * 2} holerites (2 por página)`);

      const pagePayslips: PayslipPosition[][] = [];

      for (let i = 0; i < totalPages; i++) {
        console.log(`[PDF Splitter] Processando página ${i + 1}/${totalPages}`);
        const pageText = await this.extractTextFromPage(pdfBuffer, i);
        const foundNames = this.findTwoEmployeeNames(pageText, employees);

        pagePayslips.push(foundNames);

        if (foundNames.length > 0) {
          foundNames.forEach(payslip => {
            const tag = payslip.confidence === 'fuzzy' ? '⚠ FALLBACK' : '✓';
            console.log(`[PDF Splitter] ${tag} Nome encontrado na página ${i + 1} (${payslip.position}): ${payslip.employeeName} [${payslip.confidence}]`);
          });
        } else {
          console.log(`[PDF Splitter] ⚠ Nenhum nome (confiável) encontrado na página ${i + 1}`);
        }
      }

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const payslipsInPage = pagePayslips[pageIndex];

        if (payslipsInPage.length === 0) {
          console.log(`[PDF Splitter] Pulando página ${pageIndex + 1} - sem nomes identificados`);
          continue;
        }

        for (const payslip of payslipsInPage) {
          try {
            const croppedPdf = await this.createCroppedPdf(pdfDoc, pageIndex, payslip.position);
            result.set(payslip.employeeName, croppedPdf);

            if (payslip.confidence === 'fuzzy') {
              matchesFracos.push(payslip.employeeName);
            }

            console.log(`[PDF Splitter] ✅ PDF criado para: ${payslip.employeeName} (${payslip.position}) [${payslip.confidence}]`);
          } catch (error: any) {
            console.error(`[PDF Splitter] ❌ Erro ao criar PDF para ${payslip.employeeName}:`, error.message);
          }
        }
      }

      console.log(`[PDF Splitter] ✅ Concluído: ${result.size} PDFs individuais criados de ${totalPages * 2} esperados`);
      if (matchesFracos.length > 0) {
        console.warn(`[PDF Splitter] ⚠⚠ ATENÇÃO: ${matchesFracos.length} holerite(s) identificado(s) por fallback (menos confiável) — confira manualmente antes de confiar 100%: ${matchesFracos.join(', ')}`);
      }
      return result;
    } catch (error: any) {
      console.error('[PDF Splitter] ❌ Erro ao processar PDF:', error);
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

      const loadingTask = this.pdfjsLib.getDocument({
        data: new Uint8Array(pdfBytes),
        useSystemFonts: true,
        standardFontDataUrl: null,
      });

      const pdfDocument = await loadingTask.promise;
      const page1 = await pdfDocument.getPage(1);
      const textContent = await page1.getTextContent();

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

  private findTwoEmployeeNames(pageText: string, employees: Employee[]): PayslipPosition[] {
    const result: PayslipPosition[] = [];

    if (!pageText || pageText.length < 50) {
      console.log('[PDF Splitter] ⚠ Texto muito curto, pulando divisão');
      return result;
    }

    const midPoint = Math.floor(pageText.length / 2);
    const topHalf = pageText.substring(0, midPoint);
    const bottomHalf = pageText.substring(midPoint);

    console.log(`[PDF Splitter] Dividindo texto: ${topHalf.length} chars (top) + ${bottomHalf.length} chars (bottom)`);

    const topMatch = this.findEmployeeName(topHalf, employees);
    if (topMatch) {
      result.push({ employeeName: topMatch.employeeName, position: 'top', confidence: topMatch.confidence });
    } else {
      console.log('[PDF Splitter] ⚠ Nome não encontrado (ou ambíguo) na metade superior — página não atribuída');
    }

    const bottomMatch = this.findEmployeeName(bottomHalf, employees);
    if (bottomMatch) {
      result.push({ employeeName: bottomMatch.employeeName, position: 'bottom', confidence: bottomMatch.confidence });
    } else {
      console.log('[PDF Splitter] ⚠ Nome não encontrado (ou ambíguo) na metade inferior — página não atribuída');
    }

    return result;
  }

  /**
   * Busca um nome de colaborador no texto.
   * Retorna null se não achar, OU se o resultado for ambíguo (mais de um
   * colaborador batendo igualmente) — nesses casos a página fica sem dono
   * em vez de arriscar atribuir pra pessoa errada.
   */
  private findEmployeeName(text: string, employees: Employee[]): NameMatch | null {
    const normalizedText = this.normalizeText(text);

    // 1) Match exato: nome completo aparece literalmente no texto.
    const exactMatches = employees.filter((employee) =>
      normalizedText.includes(this.normalizeText(employee.nome))
    );
    if (exactMatches.length === 1) {
      return { employeeName: exactMatches[0].nome, confidence: 'exact' };
    }
    if (exactMatches.length > 1) {
      console.warn(
        `[PDF Splitter] ⚠ Ambiguidade no match exato entre: ${exactMatches.map((e) => e.nome).join(' / ')} — página pulada, precisa de revisão manual`
      );
      return null;
    }

    // 2) Fallback por partes do nome — só entra em jogo se o match exato falhou
    //    (comum com ruído de OCR). Calcula a pontuação de TODOS os colaboradores
    //    e só aceita se houver um vencedor único e sem empate.
    const MIN_PART_LEN = 3;
    const MIN_MATCHES = 2;

    const candidatos = employees
      .map((employee) => {
        const normalizedName = this.normalizeText(employee.nome);
        const nameParts = normalizedName.split(' ').filter((p) => p.length > MIN_PART_LEN);
        const matches = nameParts.filter((part) => normalizedText.includes(part)).length;
        const confiavel =
          matches >= MIN_MATCHES || (nameParts.length === 1 && matches === 1 && nameParts[0].length > 6);
        return { employee, matches, confiavel };
      })
      .filter((c) => c.confiavel)
      .sort((a, b) => b.matches - a.matches);

    if (candidatos.length === 0) {
      return null;
    }

    // Empate no topo = ambíguo, não dá pra saber de quem é a página.
    if (candidatos.length > 1 && candidatos[1].matches === candidatos[0].matches) {
      const empatados = candidatos
        .filter((c) => c.matches === candidatos[0].matches)
        .map((c) => c.employee.nome)
        .join(' / ');
      console.warn(`[PDF Splitter] ⚠ Empate no fallback de nome: ${empatados} — página pulada, precisa de revisão manual`);
      return null;
    }

    console.warn(
      `[PDF Splitter] ⚠ Match por fallback (menos confiável) pra "${candidatos[0].employee.nome}" — confira manualmente`
    );
    return { employeeName: candidatos[0].employee.nome, confidence: 'fuzzy' };
  }

  private async createCroppedPdf(
    pdfDoc: PDFDocument,
    pageIndex: number,
    position: 'top' | 'bottom'
  ): Promise<Buffer> {
    const newPdf = await PDFDocument.create();
    const [originalPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);

    const { width, height } = originalPage.getSize();
    const halfHeight = height / 2;

    if (position === 'top') {
      originalPage.setCropBox(0, halfHeight, width, height);
    } else {
      originalPage.setCropBox(0, 0, width, halfHeight);
    }

    newPdf.addPage(originalPage);

    const pdfBytes = await newPdf.save();
    return Buffer.from(pdfBytes);
  }

  private normalizeText(text: string): string {
    const semAcento = text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return semAcento
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
