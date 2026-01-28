
## Plano: Corrigir Parser CSV para Novo Layout de Importacao

### Problema Identificado

O arquivo CSV possui uma estrutura especifica que o parser atual nao esta reconhecendo corretamente:

**Estrutura do CSV:**
```text
Linha 1: Header malformado (lixo) - deve ser ignorada
Linha 2: Header real - "Nome_Funcionario","CPF","Descricao_Cargo","Centro_de_Custo","Empresa","Situacao"
Linha 3+: Dados
```

**Formato dos dados:**
- Separador: virgula dentro de aspas duplas (`","`)
- Valores envoltos em aspas duplas
- Total: 4.405 linhas (aproximadamente 4.403 funcionarios)

### Mapeamento de Colunas

| Coluna no CSV | Campo no Sistema | Status Atual |
|---------------|------------------|--------------|
| NOME_FUNCIONARIO | nome | Nao reconhecido (underscore) |
| CPF | cpf | OK |
| DESCRICAO_CARGO | cargo | Nao reconhecido |
| CENTRO_DE_CUSTO | departamento | Nao reconhecido (underscore) |
| EMPRESA | empresa | OK |
| SITUACAO | ativo | Parcialmente (sem acento) |

### Mudancas Necessarias

**1. Melhorar parsing de CSV com aspas**

O parser atual usa `split(/[,;]/)` que nao trata corretamente valores com virgulas dentro de aspas. Precisa de um parser mais robusto.

**2. Adicionar mapeamentos de header ausentes**

Atualizar a funcao `parseCsv` para reconhecer:

```typescript
// Mapeamentos atualizados
cpf: row.cpf || row.cpf_funcionario || '',
nome: row.nome || row.nome_funcionario || row.funcionario || '',  // nome_funcionario ja existe
cargo: row.cargo || row.funcao || row.posicao || row.descricao_cargo || '',  // ADICIONAR
departamento: row.departamento || row.depto || row.setor || row.centro_de_custo || '',  // ADICIONAR
empresa: row.empresa || row.empresa_nome || row.companhia || '',
ativo: row.ativo || row.status || row.situacao || '',  // situacao ja existe
```

**3. Limpar headers de underscores**

Normalizar headers convertendo underscores para strings continuas:

```typescript
.replace(/_/g, '') // Remove underscores: nome_funcionario -> nomefuncionario
```

Ou adicionar variacoes com underscore no mapeamento.

**4. Ignorar linhas de header malformadas**

Detectar e pular a primeira linha se ela contiver caracteres estranhos como `'NOME_`.

**5. Parser de CSV com suporte a aspas**

Implementar ou usar um parser que respeite aspas:

```typescript
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};
```

### Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ImportFuncionariosDialog.tsx` | Atualizar parseCsv com novo parser e mapeamentos |

### Detalhes Tecnicos

**Nova funcao parseCsv:**

1. Detectar e remover linha 1 se for lixo (comecar com `'` ou conter `""'`)
2. Usar a linha 2 como header real
3. Normalizar headers:
   - Converter para minusculas
   - Remover acentos
   - Remover aspas
   - Converter underscores para versoes sem underscore OU adicionar mapeamentos
4. Fazer parsing linha por linha respeitando aspas
5. Mapear colunas para campos do sistema

**Mapeamento final de headers:**

```typescript
const headerMappings: Record<string, keyof CsvRow> = {
  // CPF
  'cpf': 'cpf',
  
  // Nome
  'nome': 'nome',
  'nomefuncionario': 'nome',
  'nome_funcionario': 'nome',
  'funcionario': 'nome',
  
  // Cargo
  'cargo': 'cargo',
  'descricaocargo': 'cargo',
  'descricao_cargo': 'cargo',
  'funcao': 'cargo',
  
  // Departamento
  'departamento': 'departamento',
  'centrodecusto': 'departamento',
  'centro_de_custo': 'departamento',
  'setor': 'departamento',
  
  // Empresa
  'empresa': 'empresa',
  
  // Status
  'ativo': 'ativo',
  'situacao': 'ativo',
  'status': 'ativo',
};
```

### Atualizacao da UI

Atualizar o texto de ajuda no dialogo para refletir o novo formato esperado:

```text
Formato esperado do CSV:
NOME_FUNCIONARIO;CPF;DESCRICAO_CARGO;CENTRO_DE_CUSTO;EMPRESA;SITUACAO
JOAO SILVA;12345678901;GERENTE;VENDAS;EMPRESA X;Ativo
```

### Resultado Esperado

- Todos os 4.403 funcionarios do CSV serao processados corretamente
- Funcionarios com `Situacao = Inativo` serao inativados e seus ativos liberados
- Funcionarios com `Situacao = Ativo` serao criados ou atualizados
- UI mostra preview correto antes da importacao
