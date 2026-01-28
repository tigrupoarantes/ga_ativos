

## Plano: Consolidar CPFs Duplicados no CSV Antes do Processamento

### Problema Atual

O CSV pode conter o mesmo CPF em múltiplas linhas (funcionário alocado em diferentes centros de custo). O processamento atual é sequencial:

```text
Linha 1: CPF 123 - Ativo   → Atualiza funcionário como ativo
Linha 2: CPF 123 - Inativo → Inativa o mesmo funcionário (SOBRESCREVE!)
```

**Resultado indesejado:** Se a última ocorrência for "Inativo", o funcionário é inativado mesmo tendo registros ativos no CSV.

### Solução Proposta

**Agrupar registros por CPF ANTES do processamento** e determinar o status final baseado na regra:

- Se **qualquer linha** com o CPF estiver como "Ativo" → Funcionário fica ATIVO
- Se **TODAS as linhas** com o CPF estiverem como "Inativo" → Funcionário é INATIVADO

### Fluxo Proposto

```text
+------------------+       +-------------------+       +------------------+
| CSV com          |       | Agrupar por CPF   |       | Processar        |
| linhas duplicadas|  →    | Consolidar status |  →    | registro único   |
| CPF              |       | Priorizar ATIVO   |       | por CPF          |
+------------------+       +-------------------+       +------------------+
```

### Mudanças no Código

**1. Criar função para consolidar registros por CPF**

```typescript
const consolidateByCpf = (rows: CsvRow[]): CsvRow[] => {
  const cpfMap = new Map<string, CsvRow[]>();
  
  // Agrupar todas as linhas pelo CPF normalizado
  rows.forEach(row => {
    const cpf = normalizeCpf(row.cpf);
    if (!cpf) return;
    
    if (!cpfMap.has(cpf)) {
      cpfMap.set(cpf, []);
    }
    cpfMap.get(cpf)!.push(row);
  });
  
  // Consolidar cada grupo de CPF
  const consolidated: CsvRow[] = [];
  
  cpfMap.forEach((cpfRows, cpf) => {
    // Verificar se ALGUM registro está ativo
    const hasActiveRecord = cpfRows.some(row => {
      if (!row.ativo) return true; // Sem status = assume ativo
      const ativoLower = row.ativo.toLowerCase();
      return ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
    });
    
    // Usar o primeiro registro ativo, ou o primeiro registro se todos inativos
    const baseRow = cpfRows.find(row => {
      if (!row.ativo) return true;
      const ativoLower = row.ativo.toLowerCase();
      return ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
    }) || cpfRows[0];
    
    // Criar registro consolidado
    const consolidatedRow: CsvRow = {
      ...baseRow,
      ativo: hasActiveRecord ? 'Ativo' : 'Inativo',
    };
    
    consolidated.push(consolidatedRow);
  });
  
  return consolidated;
};
```

**2. Aplicar consolidação após o parsing**

Na função `handleFileSelect`, após fazer o parsing do CSV:

```typescript
const rows = parseCsv(text);
const consolidatedRows = consolidateByCpf(rows);
setPreviewData(consolidatedRows);
```

**3. Atualizar preview para mostrar duplicados detectados**

Adicionar indicador na UI mostrando quantos CPFs duplicados foram consolidados:

```text
Prévia: 4403 linhas → 3800 funcionários únicos (603 CPFs duplicados consolidados)
```

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ImportFuncionariosDialog.tsx` | Adicionar função `consolidateByCpf`, aplicar consolidação no `handleFileSelect`, atualizar UI de preview |

### Detalhes de Implementação

**Interface atualizada para tracking:**

```typescript
// Adicionar estado para rastrear consolidação
const [consolidationInfo, setConsolidationInfo] = useState<{
  originalCount: number;
  uniqueCount: number;
  duplicatesConsolidated: number;
} | null>(null);
```

**Lógica de priorização de dados:**

Quando há múltiplas linhas para o mesmo CPF, usar dados do primeiro registro ATIVO encontrado. Isso garante que dados de alocações ativas tenham prioridade sobre dados de alocações encerradas.

### Resultado Esperado

1. CPFs duplicados no CSV serão consolidados em um único registro
2. Se qualquer linha com o CPF estiver ativa → funcionário permanece ativo
3. Se TODAS as linhas com o CPF estiverem inativas → funcionário é inativado e ativos liberados
4. UI mostra quantos duplicados foram consolidados
5. Processamento mais rápido (menos registros para processar)

