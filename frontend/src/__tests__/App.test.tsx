import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import App from '../App';

describe('App Component', () => {
  beforeEach(() => {
    // Mock do fetch para evitar chamadas reais à API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          stats: {
            total: 0,
            pending: 0,
            sent: 0,
            failed: 0
          },
          history: []
        }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the dashboard heading', async () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /dashboard/i });
    expect(heading).toBeInTheDocument();
    // Aguarda as chamadas assíncronas terminarem
    await screen.findByText(/total de colaboradores/i);
  });

  it('should render the sidebar with navigation', () => {
    render(<App />);
    expect(screen.getByText(/rh da 26fit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📊 dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🔔 notificações/i })).toBeInTheDocument();
  });

  it('should render statistics cards', () => {
    render(<App />);
    expect(screen.getByText(/total de colaboradores/i)).toBeInTheDocument();
    expect(screen.getByText(/unidades cadastradas/i)).toBeInTheDocument();
    expect(screen.getByText(/notificações pendentes/i)).toBeInTheDocument();
    expect(screen.getByText(/notificações falhadas/i)).toBeInTheDocument();
  });

  it('should render recent history section', () => {
    render(<App />);
    expect(screen.getByText(/envios recentes/i)).toBeInTheDocument();
  });

  it('should render quick actions section', () => {
    render(<App />);
    expect(screen.getByText(/ações rápidas/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /enviar holerites/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /nova notificação/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ver histórico/i })).toBeInTheDocument();
  });
});
