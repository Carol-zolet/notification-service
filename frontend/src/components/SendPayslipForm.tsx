import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:3001/api/v1';

export function SendPayslipForm() {
  const [unidades, setUnidades] = useState<string[]>([]);
  const [unidade, setUnidade] = useState('');
  const [subject, setSubject] = useState('Holerite');
  const [message, setMessage] = useState('Olá {{nome}}, segue seu holerite da unidade {{unidade}}.');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/unidades`)
      .then(r => r.json())
      .then(d => setUnidades(Array.isArray(d) ? d : []))
      .catch(e => console.warn(e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    if (!file) return setErro('Selecione um arquivo');
    if (!unidade) return setErro('Informe a unidade');
    setStatus('sending');

    try {
      const fd = new FormData();
      fd.append('pdfFile', file);
      fd.append('unidade', unidade);
      fd.append('subject', subject);
      fd.append('message', message);
      const res = await fetch(`${API_BASE}/payslips/process`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setErro(json.error || 'Erro');
        setStatus('error');
        return;
      }
      setResultado(json);
      setStatus('done');
    } catch (e: any) {
      setErro(e?.message || 'Erro');
      setStatus('error');
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', fontFamily: 'Arial', padding: 20 }}>
      <h2> Enviar Holerites</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label>Unidade:
          <select value={unidade} onChange={e => setUnidade(e.target.value)} style={{ width: '100%', padding: 6 }}>
            <option value="">-- selecione --</option>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label>Assunto:
          <input value={subject} onChange={e => setSubject(e.target.value)} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>Mensagem:
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>Arquivo:
          <input type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <button type="submit" disabled={status === 'sending'} style={{ padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
          {status === 'sending' ? ' Enviando...' : ' Enviar'}
        </button>
      </form>
      {erro && <div style={{ marginTop: 12, color: '#b91c1c' }}> {erro}</div>}
      {resultado && <pre style={{ marginTop: 12, background: '#f1f5f9', padding: 12, fontSize: 12 }}>{JSON.stringify(resultado, null, 2)}</pre>}
    </div>
  );
}
