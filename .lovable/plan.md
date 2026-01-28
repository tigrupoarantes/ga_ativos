

## Plano: Corrigir Lógica do Parser para Formato CSV Específico

### Problema Identificado

Analisando o arquivo CSV real:

```text
ABNER FRANCISCO DA SILVA','47126691874','ANALISTA II','BRK DEPOSITO','J. ARANTES...','Ativo'
```

**Formato real:**
- Primeiro campo NÃO tem aspas no início
- Campos separados por `','`
- Último campo termina com `'`

Quando fazemos `split("','")`:

```text
[0] = "ABNER FRANCISCO DA SILVA"   ← Sem aspas (correto!)
[1] = "47126691874"                ← Limpo
[2] = "ANALISTA II"                ← Limpo
[3] = "BRK DEPOSITO"               ← Limpo
[4] = "J. ARANTES..."              ← Limpo
[5] = "Ativo'"                     ← Tem aspas no final
```

O parser atual está tentando remover aspas do primeiro elemento quando não existem, e deveria remover apenas do último.

### Mudanças no Código

**Arquivo:** `src/components/ImportFuncionariosDialog.tsx`

**Correção na função `parseCSVLine`:**

```typescript
const parseCSVLine = (line: string): string[] => {
  // Check if line uses ',' as delimiter pattern
  if (line.includes("','")) {
    const parts = line.split("','");
    return parts.map((v, idx) => {
      let cleaned = v.trim();
      // Only the LAST element has a trailing quote to remove
      if (idx === parts.length - 1) {
        // Remove trailing quote: "Ativo'" -> "Ativo"
        cleaned = cleaned.replace(/'$/, '');
      }
      // Clean any remaining surrounding quotes (safety)
      cleaned = cleaned.replace(/^['"]|['"]$/g, '');
      return cleaned.trim();
    });
  }
  
  // ... existing standard CSV parsing
};
```

### Lógica Corrigida

| Índice | Valor Após Split | Após Limpeza |
|--------|------------------|--------------|
| 0 | ABNER FRANCISCO DA SILVA | ABNER FRANCISCO DA SILVA |
| 1 | 47126691874 | 47126691874 |
| 2 | ANALISTA II | ANALISTA II |
| 3 | BRK DEPOSITO | BRK DEPOSITO |
| 4 | J. ARANTES... | J. ARANTES... |
| 5 | Ativo' | Ativo |

### Resultado Esperado

1. Os 4.403 registros serão parseados corretamente
2. Preview mostrará os dados consolidados
3. Importação funcionará com a lógica de CPFs duplicados

