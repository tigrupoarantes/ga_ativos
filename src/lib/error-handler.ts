/**
 * Traduz erros técnicos do PostgreSQL/Supabase em mensagens amigáveis para o usuário.
 * O erro original é registrado no console para depuração.
 */

const ERROR_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /invalid input syntax/i,
    message: "Verifique os dados preenchidos e tente novamente.",
  },
  {
    pattern: /duplicate key|unique constraint|already exists/i,
    message: "Este registro já existe no sistema.",
  },
  {
    pattern: /violates foreign key/i,
    message: "Este registro está vinculado a outros dados e não pode ser alterado.",
  },
  {
    pattern: /permission denied|row.level.security|new row violates row-level security/i,
    message: "Você não tem permissão para esta ação.",
  },
  {
    pattern: /Could not find|schema cache/i,
    message: "Ocorreu um problema temporário. Tente novamente em alguns instantes.",
  },
  {
    pattern: /Failed to fetch|NetworkError|network|ERR_NETWORK|ECONNREFUSED|fetch failed/i,
    message: "Sem conexão com o servidor. Verifique sua internet.",
  },
  {
    pattern: /timeout|request timed out|AbortError/i,
    message: "A operação demorou demais. Tente novamente.",
  },
  {
    pattern: /JWT|token.*expired|not authenticated/i,
    message: "Sua sessão expirou. Faça login novamente.",
  },
  {
    pattern: /Estoque insuficiente/i,
    message: "Estoque insuficiente para realizar esta operação.",
  },
  {
    pattern: /idx_funcionarios_cpf_unique/i,
    message: "Já existe um funcionário com este CPF.",
  },
];

export function friendlyErrorMessage(action: string, error: unknown): string {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);

  // Log técnico para desenvolvedores
  console.error(`[Erro técnico] ${action}:`, error);

  // Buscar match nos padrões conhecidos
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // Mensagem genérica para erros não mapeados
  return `Não foi possível ${action}. Tente novamente ou contate o suporte.`;
}
