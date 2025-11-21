import React, { useState } from 'react';

interface NotificationFormProps {
  onSend?: (data: { title: string; message: string }) => void;
}

const NotificationForm: React.FC<NotificationFormProps> = ({ onSend }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Simulação de envio
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      if (onSend) onSend({ title, message });
      setTitle('');
      setMessage('');
    } catch (err) {
      setError('Erro ao enviar notificação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="form-notificacao">
      <div>
        <label htmlFor="title">Título</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="título"
        />
      </div>
      <div>
        <label htmlFor="message">Mensagem</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="mensagem"
        />
      </div>
      <button type="submit" disabled={loading}>
        Enviar
      </button>
      {loading && <span>Enviando...</span>}
      {error && <span>{error}</span>}
      {success && <span>Notificação enviada com sucesso!</span>}
    </form>
  );
};

export default NotificationForm;
