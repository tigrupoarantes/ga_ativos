

# Mensagens de Erro Amigáveis

## Problema
Atualmente, quando ocorre um erro (ex: "invalid input syntax for type date", "Could not find column..."), a mensagem técnica do banco de dados é exibida diretamente ao usuário. Isso confunde quem não é técnico.

## Solução
Criar uma função utilitária centralizada que traduz erros técnicos em mensagens amigáveis, e aplicá-la em todos os hooks e componentes do sistema.

## O que muda para o usuário
- Em vez de "invalid input syntax for type date: ''" verá: "Verifique os campos de data preenchidos."
- Em vez de "Could not find column..." verá: "Ocorreu um problema no servidor. Tente novamente ou contate o suporte."
- Em vez de "duplicate key value violates unique constraint" verá: "Este registro já existe no sistema."
- Mensagens sempre em português, curtas e orientadas a ação.

## Detalhes Técnicos

### 1. Criar `src/lib/error-handler.ts`
Uma função `friendlyErrorMessage(action: string, error: Error): string` que:
- Recebe a acao (ex: "criar contrato") e o erro original
- Faz match com padrões conhecidos de erros do PostgreSQL/Supabase:
  - `invalid input syntax` -> "Verifique os dados preenchidos e tente novamente."
  - `duplicate key` / `unique constraint` -> "Este registro já existe no sistema."
  - `violates foreign key` -> "Este registro está vinculado a outros dados e não pode ser alterado."
  - `permission denied` / `RLS` -> "Você não tem permissão para esta ação."
  - `Could not find` / `schema cache` -> "Ocorreu um problema temporário. Tente novamente em alguns instantes."
  - `network` / `fetch` / `Failed to fetch` -> "Sem conexão com o servidor. Verifique sua internet."
- Para erros não mapeados: "Não foi possível {acao}. Tente novamente ou contate o suporte."
- Registra o erro técnico original no `console.error` para depuração

### 2. Atualizar todos os hooks (25 arquivos)
Substituir o padrão:
```typescript
toast.error("Erro ao criar veículo: " + error.message);
```
Por:
```typescript
toast.error(friendlyErrorMessage("criar veículo", error));
```

Arquivos afetados:
- `useVeiculos.ts`, `useTiposVeiculos.ts`, `useAtribuicoes.ts`, `useEmpresas.ts`
- `useEquipes.ts`, `useFuncionarios.ts`, `useContratos.ts`, `useContratoItens.ts`
- `useContratoConsumo.ts`, `useContratoMetricas.ts`, `useContratoChat.ts`
- `useLinhasTelefonicas.ts`, `useAtivos.ts`, `useAreas.ts`
- `useVeiculosDocumentos.ts`, `useVeiculosHistoricoResponsavel.ts`, `useVeiculosMultas.ts`
- `useOrdensServico.ts`, `usePreventivas.ts`, `usePecas.ts`
- `useNotificationJobs.ts`, `useBugReports.ts`, `useWashPlans.ts`
- `useFipeConsulta.ts`, `useHistoricoAtivo.ts`

### 3. Atualizar componentes com tratamento inline
- `DynamicAssetForm.tsx`, `NotebookForm.tsx`, `CelularForm.tsx`
- `ImportVeiculosDialog.tsx`, `ImportFuncionariosDialog.tsx`, `ImportLinhasDialog.tsx`
- `WhatsAppConfigForm.tsx`, `SmtpConfigForm.tsx`, `AssetFormBuilder.tsx`
- `Permissoes.tsx`, `Contratos.tsx`

### 4. Resultado
- Erros técnicos ficam apenas no console (para desenvolvedores)
- Usuários veem mensagens claras, em português, orientadas a ação
- Manutenção centralizada: novos padrões de erro são adicionados em um único arquivo

