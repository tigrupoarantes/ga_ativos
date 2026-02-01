
# Plano: Barra de Progresso em Tempo Real para Sincronização GA360

## Visão Geral

Implementar uma barra de progresso que mostre o andamento da sincronização em tempo real, incluindo:
- Quantos registros foram processados vs total
- Fase atual (empresas/funcionários)
- Estimativa de tempo restante

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SyncToGA360.tsx                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Progress Bar                                       │  │  │
│  │  │  [████████████░░░░░░░░░░░] 45%                      │  │  │
│  │  │  Fase: Funcionários | 380/839 processados          │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           ▲                                     │
│                           │ SSE (Server-Sent Events)            │
└───────────────────────────│─────────────────────────────────────┘
                            │
┌───────────────────────────│─────────────────────────────────────┐
│                  Edge Function                                  │
│                                                                 │
│  1. Conta total de registros                                    │
│  2. Processa em lotes                                           │
│  3. Envia evento de progresso a cada lote                       │
│                                                                 │
│  Eventos SSE:                                                   │
│  - { phase: "empresas", current: 5, total: 12 }                 │
│  - { phase: "funcionarios", current: 200, total: 839 }          │
│  - { status: "complete", result: {...} }                        │
└─────────────────────────────────────────────────────────────────┘
```

## Detalhes Técnicos

### 1. Edge Function (`sync-to-ga360/index.ts`)

**Mudanças:**
- Adicionar suporte a streaming via SSE
- Contar totais antes de processar
- Enviar eventos de progresso a cada registro processado (ou a cada lote de 10)
- Enviar evento final com resultado completo

**Estrutura dos eventos:**
```typescript
// Evento de progresso
{ 
  type: "progress",
  phase: "empresas" | "funcionarios",
  current: number,
  total: number,
  message: string
}

// Evento de conclusão
{
  type: "complete",
  success: boolean,
  result: SyncResult
}
```

### 2. Hook (`useSyncToGA360.ts`)

**Mudanças:**
- Adicionar estado para progresso (`progress`)
- Usar `EventSource` ou `fetch` com streaming para receber eventos SSE
- Atualizar estado a cada evento recebido
- Manter compatibilidade com resultado final

**Novo estado:**
```typescript
interface SyncProgress {
  phase: 'idle' | 'empresas' | 'funcionarios' | 'complete';
  current: number;
  total: number;
  percentage: number;
  message: string;
}
```

### 3. Componente UI (`SyncToGA360.tsx`)

**Mudanças:**
- Adicionar componente `Progress` durante sincronização
- Mostrar fase atual com ícone
- Exibir contagem de registros processados
- Animação suave na barra de progresso

**Layout durante sincronização:**
```text
┌────────────────────────────────────────────────────┐
│ 🔄 Sincronização GA360                             │
├────────────────────────────────────────────────────┤
│                                                    │
│  Fase: 👥 Funcionários                             │
│  [████████████████░░░░░░░░░░░░░░░░░░░] 45%        │
│  380 de 839 registros processados                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/sync-to-ga360/index.ts` | Modificar | Adicionar streaming SSE e contagem de progresso |
| `src/hooks/useSyncToGA360.ts` | Modificar | Consumir SSE e expor estado de progresso |
| `src/components/SyncToGA360.tsx` | Modificar | Renderizar barra de progresso durante sync |

## Fluxo de Execução

1. Usuário clica em "Sincronizar"
2. Hook inicia conexão SSE com Edge Function
3. Edge Function:
   - Conta total de empresas e funcionários
   - Envia evento inicial com totais
   - Processa cada registro, enviando progresso
   - Envia evento final com resultado
4. UI atualiza barra de progresso em tempo real
5. Ao concluir, exibe resultado final (comportamento atual)

## Considerações

- **Fallback**: Se SSE falhar, manter comportamento atual (aguardar resposta completa)
- **Timeout**: Edge Functions têm limite de 60s, mas com streaming o timeout é estendido
- **Performance**: Enviar eventos a cada 5-10 registros para não sobrecarregar
