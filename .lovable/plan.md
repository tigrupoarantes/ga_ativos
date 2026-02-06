
# Plano: Adicionar Código de Vendedor na Importação CSV

## Objetivo

Ao importar funcionários via CSV, se o campo "código do vendedor" estiver preenchido, o sistema deve:
1. Ativar automaticamente a flag `is_vendedor = true`
2. Preencher o campo `codigo_vendedor` com o valor importado

## Arquivos a Modificar

**Arquivo:** `src/components/ImportFuncionariosDialog.tsx`

## Alterações

### 1. Atualizar o Template CSV

Adicionar a coluna `CODIGO_VENDEDOR` no template para download:

```text
Antes:  CPF;NOME;EMAIL;TELEFONE;CARGO;DEPARTAMENTO;EMPRESA;ATIVO
Depois: CPF;NOME;EMAIL;TELEFONE;CARGO;DEPARTAMENTO;EMPRESA;ATIVO;CODIGO_VENDEDOR
```

### 2. Atualizar Interface CsvRow

Adicionar o novo campo na interface:

```typescript
interface CsvRow {
  // ... campos existentes
  codigo_vendedor?: string;  // NOVO
}
```

### 3. Adicionar Mapeamento de Headers

Adicionar variações de nome de coluna para reconhecer o campo:

```typescript
const headerMappings = {
  // ... mapeamentos existentes
  'codigo_vendedor': 'codigo_vendedor',
  'codigovendedor': 'codigo_vendedor',
  'cod_vendedor': 'codigo_vendedor',
  'codvendedor': 'codigo_vendedor',
  'vendedor': 'codigo_vendedor',  // se for numérico, assume como código
};
```

### 4. Atualizar Parsing de Colunas Fixas

Na função `parseWithFixedColumns`, adicionar inicialização do campo:

```typescript
codigo_vendedor: '',
```

### 5. Atualizar Parsing com Header

Na função `parseWithHeader`, adicionar o campo no objeto mapeado:

```typescript
codigo_vendedor: '',
```

### 6. Atualizar Lógica de Importação

Na função `processImport`, adicionar a lógica para o código do vendedor:

```typescript
// Código do vendedor - se preenchido, ativa is_vendedor
if (row.codigo_vendedor) {
  const codigo = row.codigo_vendedor.replace(/\D/g, ''); // apenas números
  if (codigo) {
    updateData.is_vendedor = true;
    updateData.codigo_vendedor = codigo;
  }
}
```

### 7. Atualizar Exportação

Na função `exportFuncionarios`, incluir o campo `codigo_vendedor` na query e no CSV exportado.

## Comportamento Esperado

| Código no CSV | is_vendedor | codigo_vendedor |
|---------------|-------------|-----------------|
| `123`         | `true`      | `123`           |
| `456ABC`      | `true`      | `456`           |
| (vazio)       | não alterado| não alterado    |

## Resumo das Mudanças

1. Template CSV atualizado com nova coluna
2. Interface CsvRow com campo `codigo_vendedor`
3. 5 novos mapeamentos de header para reconhecer variações do nome
4. Inicialização do campo nas funções de parsing
5. Lógica automática: código preenchido → is_vendedor = true
6. Exportação inclui o campo
