
# Plano: Corrigir Rota de Ordens de Serviço

## Problema Identificado

Existe uma inconsistência entre o caminho no menu de navegação e a rota registrada:

| Local | Caminho |
|-------|---------|
| `OficinaLayout.tsx` (link do menu) | `/oficina/os` |
| `App.tsx` (rota registrada) | `/oficina/ordens` |

Quando você clica em "Ordens de Serviço" no menu da Oficina, o sistema tenta navegar para `/oficina/os`, mas essa rota não existe - apenas `/oficina/ordens` está registrada. Por isso aparece uma página em branco ou "Not Found".

---

## Solução

Unificar as rotas usando `/oficina/os` como caminho padrão (mais curto e consistente com o rótulo "OS").

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Alterar rota de `/oficina/ordens` para `/oficina/os` |

---

## Mudança Específica

```typescript
// src/App.tsx - Linha 82
// ANTES:
<Route path="/oficina/ordens" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />

// DEPOIS:
<Route path="/oficina/os" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
```

---

## Por que esta solução?

1. O menu já usa `/oficina/os` - apenas 1 arquivo precisa ser alterado
2. O caminho `/oficina/os` é mais curto e alinhado com o rótulo "OS" usado no menu mobile
3. Mantém consistência com o padrão de URLs curtas do módulo Oficina

---

## Resultado Esperado

Ao clicar em "Ordens de Serviço" no menu da Oficina, a página será exibida corretamente com:
- Listagem de ordens existentes
- Filtros por status
- Botão para criar nova ordem
- Opções de edição, fechamento e exclusão
