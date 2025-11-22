import React, { useEffect, useState } from 'react';
import { config } from '../config';

interface Colaborador {
  id: string;
  nome: string;
  email: string;
  unidade: string;
  createdAt?: string;
}

export function ColaboradoresCRUD() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [form, setForm] = useState<Partial<Colaborador>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Listar todos
  const fetchColaboradores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/colaboradores`);
      const data = await res.json();
      setColaboradores(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColaboradores();
  }, []);

  // Criar ou editar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.nome || !form.email || !form.unidade) {
      setErro('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId
        ? `${config.apiBaseUrl}/colaboradores/${editId}`
        : `${config.apiBaseUrl}/colaboradores`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setErro(err.error || 'Erro ao salvar');
        setLoading(false);
        return;
      }
      setForm({});
      setEditId(null);
      fetchColaboradores();
    } catch (e) {
      setErro('Erro ao salvar colaborador');
    } finally {
      setLoading(false);
    }
  };

  // Excluir
  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma excluir colaborador?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/colaboradores/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        setErro(err.error || 'Erro ao excluir');
        setLoading(false);
        return;
      }
      fetchColaboradores();
    } catch (e) {
      setErro('Erro ao excluir colaborador');
    } finally {
      setLoading(false);
    }
  };

  // Preencher formulário para edição
  const handleEdit = (colab: Colaborador) => {
    setForm({ nome: colab.nome, email: colab.email, unidade: colab.unidade });
    setEditId(colab.id);
    setErro(null);
  };

  // Limpar formulário
  const handleCancel = () => {
    setForm({});
    setEditId(null);
    setErro(null);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2>Colaboradores</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Nome"
          value={form.nome || ''}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          style={{ flex: 1 }}
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email || ''}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          style={{ flex: 1 }}
        />
        <input
          type="text"
          placeholder="Unidade"
          value={form.unidade || ''}
          onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={loading} style={{ minWidth: 100 }}>
          {editId ? 'Salvar' : 'Adicionar'}
        </button>
        {editId && (
          <button type="button" onClick={handleCancel} style={{ minWidth: 80 }}>
            Cancelar
          </button>
        )}
      </form>
      {erro && <div style={{ color: 'red', marginBottom: 8 }}>{erro}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Unidade</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {colaboradores.map(colab => (
            <tr key={colab.id}>
              <td>{colab.nome}</td>
              <td>{colab.email}</td>
              <td>{colab.unidade}</td>
              <td>
                <button onClick={() => handleEdit(colab)} disabled={loading} style={{ marginRight: 8 }}>
                  Editar
                </button>
                <button onClick={() => handleDelete(colab.id)} disabled={loading} style={{ color: 'red' }}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
