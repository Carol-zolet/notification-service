export type TipoErroEnvio = 'rate_limit' | 'erro_desconhecido';

/**
 * Distingue rate limit (temporário, vale a pena reenviar depois) de qualquer
 * outro erro (email inválido, anexo corrompido, etc. — definitivo, não adianta
 * retentar). O BrevoApiService propaga `error.status` com o código HTTP real
 * quando a Brevo responde; se não vier status nenhum (timeout/conexão), também
 * não é rate limit — é outra categoria de problema.
 */
export function classificarErro(error: any): TipoErroEnvio {
  const status = error?.status ?? error?.response?.status;
  const msg = String(error?.message || '').toLowerCase();

  if (
    status === 429 ||
    msg.includes('quota') ||
    msg.includes('limit') ||
    msg.includes('too many requests')
  ) {
    return 'rate_limit';
  }
  return 'erro_desconhecido';
}
