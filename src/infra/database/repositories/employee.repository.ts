import { Employee } from '../../../domain/entities/employee.entity';

export class EmployeeRepository {
  /**
   * Busca funcionário por nome e unidade
   * IMPORTANTE: O nome deve ser normalizado (sem acentos, uppercase)
   */
  async findByNameAndUnit(nome: string, unidade: string): Promise<Employee | null> {
    // TODO: Implementar busca no banco de dados real
    // Por enquanto, mock para teste
    
    const normalizedNome = this.normalizeName(nome);
    
    // Simulação de banco de dados
    const mockDatabase: Employee[] = [
      { nome: 'JOAO SILVA', email: 'joao.silva@empresa.com', unidade: 'UNIDADE1' },
      { nome: 'MARIA SANTOS', email: 'maria.santos@empresa.com', unidade: 'UNIDADE1' },
      { nome: 'PEDRO OLIVEIRA', email: 'pedro.oliveira@empresa.com', unidade: 'UNIDADE2' },
    ];

    const employee = mockDatabase.find(
      emp => this.normalizeName(emp.nome) === normalizedNome && emp.unidade === unidade
    );

    return employee || null;
  }

  /**
   * Busca todos os funcionários de uma unidade
   */
  async findByUnit(unidade: string): Promise<Employee[]> {
    // TODO: Implementar busca no banco de dados real
    const mockDatabase: Employee[] = [
      { nome: 'JOAO SILVA', email: 'joao.silva@empresa.com', unidade: 'UNIDADE1' },
      { nome: 'MARIA SANTOS', email: 'maria.santos@empresa.com', unidade: 'UNIDADE1' },
    ];

    return mockDatabase.filter(emp => emp.unidade === unidade);
  }

  /**
   * Normaliza nome para comparação (remove acentos, uppercase, espaços extras)
   */
  private normalizeName(nome: string): string {
    return nome
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ') // Remove espaços extras
      .trim();
  }
}