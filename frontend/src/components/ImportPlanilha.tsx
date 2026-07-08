import React, { useState, useRef } from 'react';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';

interface RegistroPlanilha {
  nome: string;
  email: string;
  unidade: string;
}

interface Removido {
  id: string;
  nome: string;
  email: string;
  unidade: string;
}

interface MudancaUnidade {
  nome: string;
  email: string;
  unidadeAntiga: string;
  unidadeNova: string;
}

interface AtualizacaoNome {
  email: string;
  nomeAntigo: string;
  nomeNovo: string;
  unidade: string;
}

interface PreviewResponse {
  totalNaPlanilha: number;
  novos: RegistroPlanilha[];
  removidos: Removido[];
  mudancasUnidade: MudancaUnidade[];
  atualizacoesNome: AtualizacaoNome[];
  novasUnidades: string[];
  semMudanca: number;
  registros: RegistroPlanilha[];
}

export default function ImportPlanilha() {
  const { authFetch } = useAuth();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [emailsExcluir, setEmailsExcluir] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<string>('');
  const [arrastandoSobre, setArrastandoSobre] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const extensoesAceitas = ['.xlsx', '.xls', '.csv'];

  const validarESetarArquivo = (file: File | null) => {
    if (!file) return;
    const nomeMinusculo = file.name.toLowerCase();
    const valido = extensoesAceitas.some((ext) => nomeMinusculo.endsWith(ext));
    if (!valido) {
      setErro('Formato inválido. Envie um arquivo .xlsx, .xls ou .csv');
      return;
    }
    setErro('');
    setArquivo(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastandoSobre(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastandoSobre(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastandoSobre(false);
    const file = e.dataTransfer.files?.[0] || null;
    validarESetarArquivo(file);
  };

  const handleAnalisar = async () => {
    if (!arquivo) return;
    setLoading(true);
    setErro('');
    setResultado('');
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append('planilha', arquivo);
      const res = await authFetch(`${config.apiBaseUrl}/import/colaboradores/preview`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar planilha');
      setPreview(data);
      // Por segurança, NINGUÉM começa marcado para exclusão — ela precisa
      // marcar manualmente quem realmente saiu, em vez de desmarcar quem ficar.
      setEmailsExcluir(new Set());
    } catch (err: any) {
      setErro(err.message || 'Erro ao analisar planilha');
    } finally {
      setLoading(false);
    }
  };

  const toggleExcluir = (email: string) => {
    setEmailsExcluir((prev) => {
      const novo = new Set(prev);
      if (novo.has(email)) novo.delete(email);
      else novo.add(email);
      return novo;
    });
  };

  const handleConfirmar = async () => {
    if (!preview) return;
    if (!window.confirm(
      `Confirma a importação?\n\n` +
      `+ ${preview.novos.length} novo(s) colaborador(es)\n` +
      `~ ${preview.mudancasUnidade.length} mudança(s) de unidade\n` +
      `- ${emailsExcluir.size} exclusão(ões)${emailsExcluir.size === 0 ? ' (nenhuma marcada)' : ''}\n\n` +
      `Essa ação atualiza o banco de dados.`
    )) return;

    setLoading(true);
    setErro('');
    try {
      const res = await authFetch(`${config.apiBaseUrl}/import/colaboradores/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registros: preview.registros,
          emailsParaExcluir: Array.from(emailsExcluir),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar importação');
      setResultado(
        `✅ Importação concluída: ${data.processados} processado(s), ${data.excluidos} excluído(s).`
      );
      setPreview(null);
      setArquivo(null);
    } catch (err: any) {
      setErro(err.message || 'Erro ao confirmar importação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Importar Planilha de Colaboradores</h2>
      <p style={styles.subtitle}>
        Suba a planilha (.xlsx, .xls ou .csv) com as colunas <b>Unidade</b>, <b>Nome</b> e <b>Email</b>.
        O sistema compara com o que já está cadastrado e mostra quem entrou, quem saiu e quem mudou de unidade
        antes de aplicar qualquer alteração.
      </p>

      {erro && <div style={styles.error}>{erro}</div>}
      {resultado && <div style={styles.success}>{resultado}</div>}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          ...styles.dropzone,
          ...(arrastandoSobre ? styles.dropzoneAtivo : {}),
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => validarESetarArquivo(e.target.files?.[0] || null)}
          style={styles.fileInputEscondido}
        />
        {arquivo ? (
          <span style={styles.dropzoneTextoArquivo}>📄 {arquivo.name}</span>
        ) : (
          <span style={styles.dropzoneTexto}>
            {arrastandoSobre ? 'Solte o arquivo aqui' : 'Arraste a planilha aqui ou clique para escolher'}
          </span>
        )}
      </div>

      <div style={styles.uploadRow}>
        <button
          onClick={handleAnalisar}
          disabled={!arquivo || loading}
          style={styles.btnPrimary}
        >
          {loading ? 'Analisando...' : 'Analisar Planilha'}
        </button>
      </div>

      {preview && (
        <div style={styles.previewBox}>
          <div style={styles.resumo}>
            <span>{preview.totalNaPlanilha} linhas na planilha</span>
            <span>{preview.semMudanca} sem mudança</span>
          </div>

          {preview.novasUnidades.length > 0 && (
            <Secao titulo={`🏢 Novas unidades detectadas (${preview.novasUnidades.length})`} cor="#3498db">
              {preview.novasUnidades.map((u) => (
                <div key={u} style={styles.linha}>{u}</div>
              ))}
            </Secao>
          )}

          {preview.novos.length > 0 && (
            <Secao titulo={`🟢 Entraram (${preview.novos.length})`} cor="#27ae60">
              {preview.novos.map((r) => (
                <div key={r.email} style={styles.linha}>
                  {r.nome} — {r.email} <span style={styles.tag}>{r.unidade}</span>
                </div>
              ))}
            </Secao>
          )}

          {preview.mudancasUnidade.length > 0 && (
            <Secao titulo={`🔄 Mudaram de unidade (${preview.mudancasUnidade.length})`} cor="#f39c12">
              {preview.mudancasUnidade.map((m) => (
                <div key={m.email} style={styles.linha}>
                  {m.nome} — {m.unidadeAntiga} → <b>{m.unidadeNova}</b>
                </div>
              ))}
            </Secao>
          )}

          {preview.atualizacoesNome.length > 0 && (
            <Secao titulo={`✏️ Nome atualizado (${preview.atualizacoesNome.length})`} cor="#95a5a6">
              {preview.atualizacoesNome.map((a) => (
                <div key={a.email} style={styles.linha}>
                  {a.nomeAntigo} → <b>{a.nomeNovo}</b> <span style={styles.tag}>{a.unidade}</span>
                </div>
              ))}
            </Secao>
          )}

          {preview.removidos.length > 0 && (
            <Secao titulo={`🔴 Saíram — não estão mais na planilha (${preview.removidos.length})`} cor="#e74c3c">
              <p style={styles.aviso}>
                Marque quem realmente saiu e deve ser excluído. Ninguém é excluído por padrão.
              </p>
              <div style={styles.acoesRapidas}>
                <button
                  type="button"
                  onClick={() => setEmailsExcluir(new Set(preview.removidos.map((r) => r.email)))}
                  style={styles.btnLink}
                >
                  Marcar todos
                </button>
                <button
                  type="button"
                  onClick={() => setEmailsExcluir(new Set())}
                  style={styles.btnLink}
                >
                  Desmarcar todos
                </button>
              </div>
              {preview.removidos.map((r) => (
                <label key={r.email} style={styles.linhaCheckbox}>
                  <input
                    type="checkbox"
                    checked={emailsExcluir.has(r.email)}
                    onChange={() => toggleExcluir(r.email)}
                  />
                  {r.nome} — {r.email} <span style={styles.tag}>{r.unidade}</span>
                </label>
              ))}
            </Secao>
          )}

          <button onClick={handleConfirmar} disabled={loading} style={styles.btnConfirmar}>
            {loading ? 'Aplicando...' : '✓ Confirmar Importação'}
          </button>
        </div>
      )}
    </div>
  );
}

function Secao({ titulo, cor, children }: { titulo: string; cor: string; children: React.ReactNode }) {
  return (
    <div style={{ ...styles.secao, borderLeftColor: cor }}>
      <h4 style={{ ...styles.secaoTitulo, color: cor }}>{titulo}</h4>
      {children}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { maxWidth: '900px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  title: { marginTop: 0, color: '#2c3e50' },
  subtitle: { color: '#7f8c8d', fontSize: '14px', lineHeight: 1.5 },
  error: { backgroundColor: '#e74c3c', color: 'white', padding: '15px', borderRadius: '4px', marginBottom: '15px' },
  success: { backgroundColor: '#27ae60', color: 'white', padding: '15px', borderRadius: '4px', marginBottom: '15px' },
  uploadRow: { display: 'flex', gap: '15px', alignItems: 'center', margin: '20px 0', flexWrap: 'wrap' },
  dropzone: { border: '2px dashed #bdc3c7', borderRadius: '8px', padding: '30px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#fafafa', transition: 'all 0.2s', marginTop: '20px' },
  dropzoneAtivo: { borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.08)' },
  dropzoneTexto: { color: '#7f8c8d', fontSize: '14px' },
  dropzoneTextoArquivo: { color: '#2c3e50', fontSize: '14px', fontWeight: 'bold' },
  fileInputEscondido: { display: 'none' },
  btnPrimary: { padding: '12px 24px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  btnConfirmar: { padding: '14px 28px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', marginTop: '10px', width: '100%' },
  previewBox: { marginTop: '20px' },
  resumo: { display: 'flex', gap: '20px', color: '#7f8c8d', fontSize: '13px', marginBottom: '15px' },
  secao: { borderLeft: '4px solid', paddingLeft: '15px', marginBottom: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px', padding: '12px 12px 12px 15px' },
  secaoTitulo: { margin: '0 0 10px 0', fontSize: '15px' },
  linha: { padding: '6px 0', fontSize: '14px', borderBottom: '1px solid #ecf0f1' },
  linhaCheckbox: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '14px', borderBottom: '1px solid #ecf0f1', cursor: 'pointer' },
  tag: { fontSize: '12px', color: '#7f8c8d', marginLeft: '8px' },
  aviso: { fontSize: '13px', color: '#e67e22', margin: '0 0 10px 0' },
  acoesRapidas: { display: 'flex', gap: '15px', marginBottom: '10px' },
  btnLink: { background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' },
};
