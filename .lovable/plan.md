

## Plano: Corrigir Importação de Veículos

### Problemas Identificados

**Erro 1 - Datas Inválidas (Principal)**

O banco retorna:
```
"date/time field value out of range: \"2025-21-01\""
```

O problema está na função `parseDate()`. Quando o Excel envia datas como números seriais, a conversão gera datas impossíveis (mês 21).

**Erro 2 - Placas Duplicadas**

Mesmo após desativar os veículos (`active=false`), a constraint `veiculos_placa_key` bloqueia novas inserções. O soft delete não funciona com constraints de unicidade globais.

---

### Correções Necessárias

#### 1. Corrigir função `parseDate()`

A função precisa:
- Validar se a data gerada é válida antes de retornar
- Tratar corretamente datas do Excel em formato serial
- Detectar e corrigir inversão de mês/dia

```typescript
const parseDate = (val: string | number | undefined): string | null => {
  if (val === undefined || val === null || val === '') return null;
  
  let year: number, month: number, day: number;
  
  // Handle Excel serial date
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      year = date.y;
      month = date.m;
      day = date.d;
    } else {
      return null;
    }
  } else {
    const str = val.toString().trim();
    
    // DD/MM/YYYY ou D/M/YY (formato brasileiro)
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      year = parseInt(match[3]);
      if (year < 100) year = year > 50 ? 1900 + year : 2000 + year;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str; // Already ISO
    } else {
      return null;
    }
  }
  
  // Validar data
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null; // Data inválida - ignorar
  }
  
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
};
```

#### 2. Deletar permanentemente veículos antigos

Para permitir reimportação das mesmas placas:

```sql
-- Deletar PERMANENTEMENTE veículos inativos para liberar placas
DELETE FROM veiculos WHERE active = false;
```

#### 3. Adicionar tratamento de erro melhorado

Mostrar mensagem clara quando uma data for inválida, em vez de tentar inserir.

---

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/ImportVeiculosDialog.tsx` | Corrigir `parseDate()`, adicionar validação de data |
| Migração SQL | Deletar veículos inativos para liberar placas |

---

### Resultado Esperado

Após as correções:
- Datas serão interpretadas corretamente no formato DD/MM/YYYY
- Datas inválidas serão ignoradas (campo ficará null)
- Placas antigas (inativas) serão removidas, liberando para reimportação
- 137 veículos serão importados com sucesso

