
# Correção: Funcionários Não Aparecem na Tela

## Diagnóstico

Os funcionários **NÃO desapareceram do banco de dados**:
- Contagem no banco: **839 registros ativos**
- Requisições HTTP estão retornando dados corretamente (status 200)
- Response Body contém lista completa de funcionários

## Problema Identificado

O código em `src/pages/Funcionarios.tsx` está usando `useState` incorretamente ao invés de `useEffect`:

```typescript
// CÓDIGO ATUAL (INCORRETO) - Linhas 73-75 e 110-112
useState(() => {
  setSearch(debouncedSearch);
});
```

### Por que isso causa problemas?

| Uso | Comportamento | Resultado |
|-----|---------------|-----------|
| `useState(() => fn())` | Executa apenas 1x na montagem | Busca nunca é sincronizada |
| `useEffect(() => fn(), [deps])` | Executa quando deps mudam | Busca é sincronizada corretamente |

Este uso incorreto impede que a lista seja atualizada quando o componente é renderizado, causando a impressão de que os funcionários "sumiram".

## Solução

Substituir as chamadas incorretas de `useState` por `useEffect`:

### Arquivo: `src/pages/Funcionarios.tsx`

**Mudanças:**

1. **Adicionar `useEffect` aos imports** (linha 1)
2. **Remover as duas chamadas incorretas de `useState`** (linhas 73-75 e 110-112)
3. **Adicionar um único `useEffect` correto** para sincronizar o debounce:

```typescript
import { useState, useEffect } from "react";

// ...

export default function Funcionarios() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [pageSize, setPageSize] = useState(25);
  
  const {
    funcionarios,
    isLoading,
    page,
    totalCount,
    totalPages,
    setPage,
    setSearch,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario,
  } = useFuncionariosPaginated({ pageSize });

  // CORRETO: useEffect para sincronizar debounce
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);
  
  // ... resto do código
```

4. **Remover código morto** (linhas 105-112):
```typescript
// REMOVER ESTAS LINHAS:
// Effect to sync debounced search
if (debouncedSearch !== searchInput) {
  // This will trigger on next render cycle
}

// Update search in hook when debounce changes
useState(() => {
  setSearch(debouncedSearch);
});
```

## Resumo das Alterações

| Linha | Antes | Depois |
|-------|-------|--------|
| 1 | `import { useState } from "react"` | `import { useState, useEffect } from "react"` |
| 73-75 | `useState(() => { setSearch... })` | **REMOVER** |
| 105-112 | Código de sincronização morto | **REMOVER** |
| Novo | - | `useEffect(() => { setSearch(debouncedSearch) }, [debouncedSearch, setSearch])` |

## Resultado Esperado

Após a correção:
- Os 839 funcionários voltarão a aparecer na listagem
- A busca com debounce funcionará corretamente
- O componente sincronizará corretamente o estado de busca
