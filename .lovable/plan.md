
# Plano de Migração Completo: Supabase Externo

## Objetivo
Atualizar **todos os 43 arquivos** que importam do cliente Supabase para usar o Supabase externo.

---

## Arquivos a Modificar

### Contexto (1 arquivo)
| Arquivo | Caminho |
|---------|---------|
| AuthContext | `src/contexts/AuthContext.tsx` |

### Hooks (24 arquivos)
| Arquivo | Caminho |
|---------|---------|
| useAtivos | `src/hooks/useAtivos.ts` |
| useAtribuicoes | `src/hooks/useAtribuicoes.ts` |
| useAuditLog | `src/hooks/useAuditLog.ts` |
| useContratos | `src/hooks/useContratos.ts` |
| useDashboardStats | `src/hooks/useDashboardStats.ts` |
| useEmpresas | `src/hooks/useEmpresas.ts` |
| useEquipes | `src/hooks/useEquipes.ts` |
| useFipeConsulta | `src/hooks/useFipeConsulta.ts` |
| useFuncionarios | `src/hooks/useFuncionarios.ts` |
| useHistoricoAtivo | `src/hooks/useHistoricoAtivo.ts` |
| useLinhasTelefonicas | `src/hooks/useLinhasTelefonicas.ts` |
| useModulePermissions | `src/hooks/useModulePermissions.ts` |
| useNotificationJobs | `src/hooks/useNotificationJobs.ts` |
| useOdometerReports | `src/hooks/useOdometerReports.ts` |
| useOrdensServico | `src/hooks/useOrdensServico.ts` |
| usePecas | `src/hooks/usePecas.ts` |
| usePreventivas | `src/hooks/usePreventivas.ts` |
| useReportsChat | `src/hooks/useReportsChat.ts` |
| useSelectOptions | `src/hooks/useSelectOptions.ts` |
| useServiceAppointments | `src/hooks/useServiceAppointments.ts` |
| useSmtpConfig | `src/hooks/useSmtpConfig.ts` |
| useStorageUpload | `src/hooks/useStorageUpload.ts` |
| useTiposVeiculos | `src/hooks/useTiposVeiculos.ts` |
| useVeiculos | `src/hooks/useVeiculos.ts` |
| useVeiculosDocumentos | `src/hooks/useVeiculosDocumentos.ts` |
| useVeiculosHistoricoResponsavel | `src/hooks/useVeiculosHistoricoResponsavel.ts` |
| useVeiculosMultas | `src/hooks/useVeiculosMultas.ts` |
| useWashPlans | `src/hooks/useWashPlans.ts` |

### Pages (7 arquivos)
| Arquivo | Caminho |
|---------|---------|
| Auth | `src/pages/Auth.tsx` |
| Historico | `src/pages/Historico.tsx` |
| Permissoes | `src/pages/Permissoes.tsx` |
| ResetPassword | `src/pages/ResetPassword.tsx` |
| TiposAtivos | `src/pages/TiposAtivos.tsx` |
| Usuarios | `src/pages/Usuarios.tsx` |
| VeiculosHistorico | `src/pages/VeiculosHistorico.tsx` |

### Components (11 arquivos)
| Arquivo | Caminho |
|---------|---------|
| AssetFormBuilder | `src/components/AssetFormBuilder.tsx` |
| CelularForm | `src/components/CelularForm.tsx` |
| ConfirmResponsavelDialog | `src/components/ConfirmResponsavelDialog.tsx` |
| DynamicAssetForm | `src/components/DynamicAssetForm.tsx` |
| ImportFuncionariosDialog | `src/components/ImportFuncionariosDialog.tsx` |
| ImportLinhasDialog | `src/components/ImportLinhasDialog.tsx` |
| ImportVeiculosDialog | `src/components/ImportVeiculosDialog.tsx` |
| NotebookForm | `src/components/NotebookForm.tsx` |
| ReportsChat | `src/components/ReportsChat.tsx` |
| VeiculoDocumentosSection | `src/components/VeiculoDocumentosSection.tsx` |
| WhatsAppConfigForm | `src/components/WhatsAppConfigForm.tsx` |

---

## Alteração em Cada Arquivo

A alteração é simples e idêntica em todos os arquivos:

**De:**
```typescript
import { supabase } from "@/integrations/supabase/client";
```

**Para:**
```typescript
import { supabase } from "@/integrations/supabase/external-client";
```

---

## Detalhes Técnicos

### Ordem de Execução
1. **AuthContext** - Primeiro, para garantir que a autenticação funcione
2. **Hooks** - Base de dados para todos os componentes
3. **Pages** - Páginas que usam Supabase diretamente
4. **Components** - Componentes que usam Supabase diretamente

### Impacto
- Todas as operações de banco de dados passam a usar o Supabase externo
- A autenticação passa a usar o Supabase externo
- O storage passa a usar o Supabase externo

---

## Configuração Adicional Necessária

### URLs de Redirecionamento no Supabase Externo
Após a migração do código, você precisa configurar as URLs de redirecionamento no dashboard do Supabase externo em **Authentication > URL Configuration**:

| Configuração | Valor |
|--------------|-------|
| **Site URL** | `https://ativosarantes.lovable.app` |
| **Redirect URLs** | `https://ativosarantes.lovable.app/*` |
| | `https://id-preview--ee614478-548f-41ab-8e11-7c646ba84572.lovable.app/*` |

### Secrets das Edge Functions
Verifique se os seguintes secrets estão configurados no Supabase externo:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (se usar reports-chat)

---

## Resultado Esperado
Após esta migração:
- Toda a aplicação usa exclusivamente o Supabase externo
- Novos usuários são criados no banco externo
- Todos os dados são salvos no banco externo
- Edge Functions funcionam com o banco externo
