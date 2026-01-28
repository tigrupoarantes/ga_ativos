

## Plano: Corrigir Parser para CSV sem Header e com Aspas Simples

### Problema Identificado

O arquivo CSV enviado tem um formato diferente do esperado:

**Formato atual do arquivo:**
```text
ABNER FRANCISCO DA SILVA','47126691874','ANALISTA II','BRK DEPOSITO','EMPRESA X','Ativo'
```

**Problemas detectados:**
1. O arquivo **nao tem linha de header** - os dados comecam diretamente na linha 1
2. Usa **aspas simples** (`'`) como delimitador, nao aspas duplas
3. O separador e `','` (aspas simples + virgula + aspas simples)
4. O parser atual retorna array vazio porque exige pelo menos 2 linhas (header + dados)

### Estrutura Fixa das Colunas

Baseado na analise do arquivo, as colunas sao:

| Posicao | Campo | Destino no Sistema |
|---------|-------|-------------------|
| 0 | Nome do Funcionario | nome |
| 1 | CPF | cpf |
| 2 | Cargo | cargo |
| 3 | Centro de Custo | departamento |
| 4 | Empresa | empresa |
| 5 | Situacao (Ativo/Inativo) | ativo |

### Solucao Proposta

Modificar a funcao `parseCsv` para:

1. **Detectar CSV sem header**: Verificar se a primeira linha contem dados (nao parece ser header)
2. **Usar mapeamento fixo por posicao**: Quando nao ha header, assumir a ordem fixa das colunas
3. **Tratar aspas simples**: O parser precisa reconhecer `'` como delimitador alem de `"`

### Mudancas no Codigo

**1. Atualizar parseCSVLine para suportar aspas simples**

```typescript
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    // Handle both single and double quotes
    if ((char === '"' || char === "'") && (!inQuotes || char === quoteChar)) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  // Clean remaining quotes from values
  return result.map(v => v.replace(/^['"]|['"]$/g, ''));
};
```

**2. Atualizar parseCsv para detectar CSV sem header**

```typescript
const parseCsv = (text: string): CsvRow[] => {
  const lines = text.trim().split('\n');
  if (lines.length < 1) return [];
  
  const firstLine = lines[0];
  
  // Detect if first line is data (no header)
  // CSV without header: first value looks like a name (letters, spaces)
  // or first line contains typical data patterns
  const firstValues = parseCSVLine(firstLine);
  
  // Check if this looks like a header or data
  // Headers usually have keywords like "CPF", "NOME", "CARGO", etc.
  const looksLikeHeader = firstValues.some(v => {
    const lower = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return ['cpf', 'nome', 'cargo', 'empresa', 'situacao', 'ativo', 'funcionario', 
            'centro', 'departamento', 'email', 'telefone'].some(h => lower.includes(h));
  });
  
  if (looksLikeHeader) {
    // Process with header mapping (current logic)
    return parseWithHeader(lines);
  } else {
    // Process with fixed column positions
    return parseWithFixedColumns(lines);
  }
};

const parseWithFixedColumns = (lines: string[]): CsvRow[] => {
  // Fixed column order: NOME, CPF, CARGO, DEPARTAMENTO, EMPRESA, SITUACAO
  const rows: CsvRow[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    if (values.length < 2) continue; // At least name and CPF required
    
    const row: CsvRow = {
      nome: values[0] || '',
      cpf: values[1] || '',
      cargo: values[2] || '',
      departamento: values[3] || '',
      empresa: values[4] || '',
      ativo: values[5] || 'Ativo',
      email: '',
      telefone: '',
      equipe: '',
      is_condutor: '',
      cnh_numero: '',
      cnh_categoria: '',
      cnh_validade: '',
    };
    
    if (row.cpf) {
      rows.push(row);
    }
  }
  
  return rows;
};
```

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ImportFuncionariosDialog.tsx` | Atualizar `parseCSVLine` para aspas simples, adicionar deteccao de CSV sem header, implementar `parseWithFixedColumns` |

### Detalhes Tecnicos

**Deteccao de tipo de CSV:**

O parser verificara a primeira linha para determinar se e um header ou dados:
- Se contem palavras-chave como "CPF", "NOME", "CARGO" -> processa com mapeamento de headers
- Se parece ser dados (nomes, numeros) -> usa mapeamento fixo por posicao

**Ordem fixa das colunas (sem header):**

1. NOME (posicao 0)
2. CPF (posicao 1)
3. CARGO (posicao 2)
4. DEPARTAMENTO/CENTRO DE CUSTO (posicao 3)
5. EMPRESA (posicao 4)
6. SITUACAO/ATIVO (posicao 5)

### Resultado Esperado

1. O arquivo CSV sem header sera processado corretamente
2. Os 4.403 registros serao identificados
3. CPFs duplicados serao consolidados (logica existente)
4. Funcionarios ativos serao atualizados/criados
5. Funcionarios inativos serao desativados com liberacao de ativos

