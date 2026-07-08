import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { requestCode, verifyCode } = useAuth();
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  const handlePedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const resultado = await requestCode(email.trim().toLowerCase());
    setLoading(false);
    if (!resultado.ok) {
      setErro(resultado.error || 'Erro ao pedir código');
      return;
    }
    setMensagem('Se este e-mail estiver autorizado, um código foi enviado. Verifique sua caixa de entrada.');
    setEtapa('codigo');
  };

  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const resultado = await verifyCode(email.trim().toLowerCase(), codigo.trim());
    setLoading(false);
    if (!resultado.ok) {
      setErro(resultado.error || 'Código inválido');
      return;
    }
    // Sucesso: o AuthContext já atualizou o token, o app re-renderiza sozinho
  };

  const handleVoltar = () => {
    setEtapa('email');
    setCodigo('');
    setErro('');
    setMensagem('');
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Painel Administrativo</h1>
        <p style={styles.subtitle}>Sistema de Holerites — 26fit</p>

        {erro && <div style={styles.error}>{erro}</div>}
        {mensagem && !erro && <div style={styles.info}>{mensagem}</div>}

        {etapa === 'email' ? (
          <form onSubmit={handlePedirCodigo}>
            <label style={styles.label}>E-mail autorizado</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@26fit.com.br"
              required
              autoFocus
              style={styles.input}
            />
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Enviando...' : 'Pedir código de acesso'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerificarCodigo}>
            <label style={styles.label}>Código recebido por e-mail</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              autoFocus
              style={{ ...styles.input, ...styles.inputCodigo }}
            />
            <button type="submit" disabled={loading || codigo.length !== 6} style={styles.btnPrimary}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <button type="button" onClick={handleVoltar} style={styles.btnSecondary}>
              Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif' },
  card: { backgroundColor: 'white', borderRadius: '8px', padding: '40px', width: '100%', maxWidth: '380px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  title: { margin: '0 0 4px 0', color: '#2c3e50', fontSize: '22px', textAlign: 'center' },
  subtitle: { margin: '0 0 24px 0', color: '#7f8c8d', fontSize: '13px', textAlign: 'center' },
  label: { display: 'block', marginBottom: '8px', fontSize: '13px', color: '#2c3e50', fontWeight: 'bold' },
  input: { width: '100%', padding: '12px', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' },
  inputCodigo: { textAlign: 'center', letterSpacing: '6px', fontSize: '20px', fontWeight: 'bold' },
  btnPrimary: { width: '100%', padding: '12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  btnSecondary: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#7f8c8d', border: 'none', cursor: 'pointer', fontSize: '13px', marginTop: '10px' },
  error: { backgroundColor: '#e74c3c', color: 'white', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' },
  info: { backgroundColor: '#e8f4fd', color: '#2c3e50', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' },
};
