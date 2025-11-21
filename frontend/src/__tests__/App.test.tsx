import '@testing-library/jest-dom';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import App from '../App';

describe('App Component', () => {
  beforeEach(() => {
    render(<App />);
  });

  it('deve renderizar o título do dashboard', () => {
    const headings = screen.getAllByText(/Dashboard/i);
    // Espera que exista um <h1> com esse texto
    const h1Heading = headings.find((el) => el.tagName === 'H1');
    expect(h1Heading).toBeInTheDocument();
  });

  it('deve renderizar a visão geral do sistema', () => {
    const subtitle = screen.getByText(/Visão geral do sistema de notificações/i);
    expect(subtitle).toBeInTheDocument();
  });
});
