

## Plano: Corrigir Parser para CSV com Formato Especial

### Problema Identificado

O arquivo CSV tem um formato incomum onde:

```text
ABNER FRANCISCO DA SILVA','47126691874','ANALISTA II','BRK DEPOSITO','EMPRESA X','Ativo'
```

**Estrutura:**
- Campos separados por `','` (aspas simples + virgula + aspas simples)
- Primeiro campo **nao comeca** com aspas
- Ultimo campo termina com aspas simples

**Por que o parser atual falha:**

O parser trata `'` como delimitador de quote. Quando encontra a primeira `'` (apos o nome), entra em modo "inQuotes" e trata todo o resto como um unico campo.

```text
Linha: ABNER FRANCISCO DA SILVA','47126691874','...
       ↑ campo 1                ↑ parser pensa que começa quote aqui
```

### Solucao

Mudar a estrategia: em vez de tratar aspas como delimitadores de campo, usar **regex ou split direto** no separador `','`:

1. Detectar se a linha usa o padrao `','` como separador
2. Se sim, fazer split direto por `','`
3. Limpar aspas residuais do primeiro e ultimo campos

### Mudancas no Codigo

**Arquivo:** `src/components/ImportFuncionariosDialog.tsx`

**1. Atualizar parseCSVLine para detectar formato especial**

```typescript
const parseCSVLine = (line: string): string[] => {
  // Check if line uses ',' as delimiter pattern (common in some exports)
  if (line.includes("','")) {
    // Split by ',' pattern
    const parts = line.split("','");
    // Clean first and last elements
    return parts.map((v, idx) => {
      let cleaned = v.trim();
      // Remove leading quote from first element
      if (idx === 0 && cleaned.endsWith("'")) {
        cleaned = cleaned.slice(0, -1);
      }
      // Remove trailing quote from last element
      if (idx === parts.length - 1 && cleaned.startsWith("'")) {
        cleaned = cleaned.slice(1);
      }
      // Remove any remaining quotes
      cleaned = cleaned.replace(/^['"]|['"]$/g, '');
      return cleaned.trim();
    });
  }
  
  // ... existing quote-aware parsing logic for standard CSVs
};
```

**2. Simplificar deteccao de header**

O arquivo nao tem header, entao a funcao `parseCsv` deve detectar isso corretamente:

- Se primeira linha contem `','` mas nao tem palavras-chave de header -> usar colunas fixas
- Se primeira linha tem palavras-chave (CPF, NOME, etc.) -> usar mapeamento de headers

### Logica de Parsing Atualizada

```text
Entrada: ABNER FRANCISCO DA SILVA','47126691874','ANALISTA II','BRK DEPOSITO','EMPRESA X','Ativo'

Split por "','":
[0] "ABNER FRANCISCO DA SILVA'" -> "ABNER FRANCISCO DA SILVA"
[1] "47126691874"
[2] "ANALISTA II"
[3] "BRK DEPOSITO"
[4] "EMPRESA X"
[5] "Ativo'" -> "Ativo"
```

### Mapeamento de Colunas (Sem Header)

| Posicao | Campo |
|---------|-------|
| 0 | nome |
| 1 | cpf |
| 2 | cargo |
| 3 | departamento |
| 4 | empresa |
| 5 | ativo |

### Resultado Esperado

1. Os 4.403 registros serao parseados corretamente
2. CPFs duplicados serao consolidados (logica existente)
3. Funcionarios ativos criados/atualizados
4. Funcionarios inativos desativados com liberacao de ativos

