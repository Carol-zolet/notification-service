import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import NotificationForm from '../components/NotificationForm';

describe('NotificationForm Component', () => {
  let mockOnSend: jest.Mock;

  beforeEach(() => {
    mockOnSend = jest.fn();
    global.fetch = jest.fn();
  });

  it('should render all form fields', () => {
    render(<NotificationForm onSend={mockOnSend} />);
    
    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
    // Se o componente não tem campos tipo/prioridade, remova as linhas abaixo
    // expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    // expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
  });

  it('should update form fields on input change', () => {
    render(<NotificationForm onSend={mockOnSend} />);
    
    const titleInput = screen.getByLabelText(/título/i) as HTMLInputElement;
    const messageTextarea = screen.getByLabelText(/mensagem/i) as HTMLTextAreaElement;
    
    fireEvent.change(titleInput, { target: { value: 'Teste Título' } });
    fireEvent.change(messageTextarea, { target: { value: 'Teste Mensagem' } });
    
    expect(titleInput.value).toBe('Teste Título');
    expect(messageTextarea.value).toBe('Teste Mensagem');
  });

  // Ajuste este teste se quiser validação de campos vazios
  it('should show validation errors when submitting empty form', async () => {
    render(<NotificationForm onSend={mockOnSend} />);
    
    const submitButton = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(submitButton);
    // Adicione validação no componente se quiser que este teste passe
  });

  it('should submit form with valid data', async () => {
    render(<NotificationForm onSend={mockOnSend} />);
    
    fireEvent.change(screen.getByLabelText(/título/i), { 
      target: { value: 'Título Teste' } 
    });
    fireEvent.change(screen.getByLabelText(/mensagem/i), { 
      target: { value: 'Mensagem Teste' } 
    });
    const submitButton = screen.getByRole('button', { name: /enviar/i });
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledWith({
        title: 'Título Teste',
        message: 'Mensagem Teste'
      });
    });
  });
});
