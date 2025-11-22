import React, { useState, useEffect } from 'react';

const API_BASE = 'https://api.carolinenotificacoes.page';

// Tipos
interface Colaborador {
  id: string;
  nome: string;
  email: string;
  unidade: string;
  createdAt?: string;
}

// ============= COLABORADORES CRUD =============
function ColaboradoresCRUD() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<Colaborador | null>(null);
  const [formData, setFormData] = useState({ nome: '', email: '', unidade: '' });

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [colabRes, unidRes] = await Promise.all([
        fetch(`${API_BASE}/colaboradores`),
        fetch(`${API_BASE}/unidades`)
      ]);
      const colabData = await colabRes.json();
      const unidData = await unidRes.json();
      setColaboradores(colabData);
      setUnidades(unidData);
      setError('');
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editando) {
        const res = await fetch(`${API_BASE}/colaboradores/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Erro ao atualizar');
      } else {
        const res = await fetch(`${API_BASE}/colaboradores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Erro ao criar');
      }
      setFormData({ nome: '', email: '', unidade: '' });
      setEditando(null);
      carregarDados();
    } catch (err) {
      setError('Erro ao salvar colaborador');
    }
  };

  const handleEditar = (colab: Colaborador) => {
    setEditando(colab);
    setFormData({ nome: colab.nome, email: colab.email, unidade: colab.unidade });
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este colaborador?')) return;
    try {
      const res = await fetch(`${API_BASE}/colaboradores/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      carregarDados();
    } catch (err) {
      setError('Erro ao excluir colaborador');
    }
  };

  const handleCancelar = () => {
    setEditando(null);
    setFormData({ nome: '', email: '', unidade: '' });
  };

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Gerenciar Colaboradores</h2>
      {error && <div style={styles.error}>{error}</div>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          <input type="text" placeholder="Nome" value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required style={styles.input} />
          <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required style={styles.input} />
          <select value={formData.unidade} onChange={e => setFormData({ ...formData, unidade: e.target.value })} required style={styles.input}>
            <option value="">Selecione uma unidade</option>
            {unidades.map(unidade => <option key={unidade} value={unidade}>{unidade}</option>)}
          </select>
        </div>
        <div style={styles.formButtons}>
          <button type="submit" style={styles.btnPrimary}>{editando ? '✓ Salvar Alterações' : '+ Adicionar Colaborador'}</button>
          {editando && <button type="button" onClick={handleCancelar} style={styles.btnSecondary}>✕ Cancelar</button>}
        </div>
      </form>
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Unidade</th>
              <th style={styles.th}>Data Criação</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map(colab => (
              <tr key={colab.id} style={styles.tr}>
                <td style={styles.td}>{colab.nome}</td>
                <td style={styles.td}>{colab.email}</td>
                <td style={styles.td}>{colab.unidade}</td>
                <td style={styles.td}>{colab.createdAt ? new Date(colab.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                <td style={styles.td}>
                  <button onClick={() => handleEditar(colab)} style={styles.btnEdit}>✏️</button>
                  <button onClick={() => handleExcluir(colab.id)} style={styles.btnDelete}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============= UNIDADES CRUD =============
function UnidadesCRUD() {
  const [unidades, setUnidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [novaUnidade, setNovaUnidade] = useState('');
  const [nomeEdit, setNomeEdit] = useState('');

  useEffect(() => { carregarUnidades(); }, []);

  const carregarUnidades = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/unidades`);
      const data = await res.json();
      setUnidades(data);
      setError('');
    } catch (err) {
      setError('Erro ao carregar unidades');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaUnidade.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unidade: novaUnidade.trim() })
      });
      if (!res.ok) throw new Error('Erro ao adicionar');
      setNovaUnidade('');
      carregarUnidades();
    } catch (err) {
      setError('Erro ao adicionar unidade');
    }
  };

  const handleEditar = async (nomeAntigo: string) => {
    if (!nomeEdit.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/unidades/${encodeURIComponent(nomeAntigo)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unidade: nomeEdit.trim() })
      });
      if (!res.ok) throw new Error('Erro ao renomear');
      setEditando(null);
      setNomeEdit('');
      carregarUnidades();
    } catch (err) {
      setError('Erro ao renomear unidade');
    }
  };

  const handleExcluir = async (nome: string) => {
    if (!window.confirm(`Deseja realmente excluir a unidade "${nome}"? Todos os colaboradores desta unidade serão removidos!`)) return;
    try {
      const res = await fetch(`${API_BASE}/unidades/${encodeURIComponent(nome)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      carregarUnidades();
    } catch (err) {
      setError('Erro ao excluir unidade');
    }
  };

  const iniciarEdicao = (unidade: string) => {
    setEditando(unidade);
    setNomeEdit(unidade);
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setNomeEdit('');
  };

  if (loading) return <div style={styles.loading}>Carregando...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Gerenciar Unidades</h2>
      {error && <div style={styles.error}>{error}</div>}
      <form onSubmit={handleAdicionar} style={styles.form}>
        <div style={styles.formInline}>
          <input type="text" placeholder="Nome da nova unidade" value={novaUnidade} onChange={e => setNovaUnidade(e.target.value)} required style={{ ...styles.input, flex: 1 }} />
          <button type="submit" style={styles.btnPrimary}>+ Adicionar Unidade</button>
        </div>
      </form>
      <div style={styles.listContainer}>
        {unidades.length === 0 ? (
          <p style={styles.empty}>Nenhuma unidade cadastrada</p>
        ) : (
          unidades.map(unidade => (
            <div key={unidade} style={styles.listItem}>
              {editando === unidade ? (
                <div style={styles.editRow}>
                  <input type="text" value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} style={{ ...styles.input, flex: 1 }} autoFocus />
                  <button onClick={() => handleEditar(unidade)} style={styles.btnEdit}>✓ Salvar</button>
                  <button onClick={cancelarEdicao} style={styles.btnSecondary}>✕ Cancelar</button>
                </div>
              ) : (
                <>
                  <span style={styles.listItemName}>{unidade}</span>
                  <div>
                    <button onClick={() => iniciarEdicao(unidade)} style={styles.btnEdit}>✏️ Renomear</button>
                    <button onClick={() => handleExcluir(unidade)} style={styles.btnDelete}>🗑️ Excluir</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============= PAINEL PRINCIPAL COM ABAS =============
export default function AdminPanel() {
  const [abaAtiva, setAbaAtiva] = useState<'colaboradores' | 'unidades'>('colaboradores');
  return (
    <div style={styles.adminPanel}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Painel Administrativo</h1>
      </div>
      <div style={styles.tabs}>
        <button onClick={() => setAbaAtiva('colaboradores')} style={{ ...styles.tab, ...(abaAtiva === 'colaboradores' ? styles.tabActive : {}) }}>👥 Colaboradores</button>
        <button onClick={() => setAbaAtiva('unidades')} style={{ ...styles.tab, ...(abaAtiva === 'unidades' ? styles.tabActive : {}) }}>🏢 Unidades</button>
      </div>
      <div style={styles.content}>
        {abaAtiva === 'colaboradores' ? <ColaboradoresCRUD /> : <UnidadesCRUD />}
      </div>
    </div>
  );
}

// ============= ESTILOS =============
const styles: { [key: string]: React.CSSProperties } = {
  adminPanel: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif' },
  header: { backgroundColor: '#2c3e50', color: 'white', padding: '20px', textAlign: 'center' },
  headerTitle: { margin: 0, fontSize: '28px' },
  tabs: { display: 'flex', backgroundColor: '#34495e', padding: '0 20px', gap: '10px' },
  tab: { padding: '15px 30px', border: 'none', backgroundColor: 'transparent', color: '#bdc3c7', cursor: 'pointer', fontSize: '16px', transition: 'all 0.3s', borderBottom: '3px solid transparent' },
  tabActive: { color: 'white', borderBottomColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)' },
  content: { padding: '20px' },
  container: { maxWidth: '1200px', margin: '0 auto', backgroundColor: 'white', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  title: { marginTop: 0, marginBottom: '20px', color: '#2c3e50' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#7f8c8d' },
  error: { backgroundColor: '#e74c3c', color: 'white', padding: '15px', borderRadius: '4px', marginBottom: '20px' },
  form: { marginBottom: '30px', padding: '20px', backgroundColor: '#ecf0f1', borderRadius: '8px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '15px' },
  formInline: { display: 'flex', gap: '15px' },
  input: { padding: '12px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px' },
  formButtons: { display: 'flex', gap: '10px' },
  btnPrimary: { padding: '12px 24px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  btnSecondary: { padding: '12px 24px', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  btnEdit: { padding: '8px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '5px' },
  btnDelete: { padding: '8px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { backgroundColor: '#34495e', color: 'white', padding: '12px', textAlign: 'left', fontWeight: 'bold' },
  tr: { borderBottom: '1px solid #ecf0f1' },
  td: { padding: '12px' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#ecf0f1', borderRadius: '4px' },
  listItemName: { fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' },
  editRow: { display: 'flex', gap: '10px', width: '100%', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#7f8c8d', padding: '40px' },
};
