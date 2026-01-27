
## Plano: Logica de Inativacao de Funcionarios na Importacao CSV

### Objetivo

Modificar o processo de importacao de funcionarios para:
1. **Nao criar** funcionarios marcados como inativos no CSV
2. **Inativar** funcionarios existentes quando o status mudar de ativo para inativo
3. **Liberar ativos** associados ao funcionario inativado (status volta para "disponivel")

### Fluxo de Processamento Atual vs Novo

```text
+---------------------+     +---------------------+
|   FLUXO ATUAL       |     |   NOVO FLUXO        |
+---------------------+     +---------------------+
| CSV com funcionario |     | CSV com funcionario |
| ativo="nao"         |     | ativo="nao"         |
|         |           |     |         |           |
|         v           |     |         v           |
| Cria/atualiza com   |     | Funcionario existe? |
| active=false        |     |    /        \       |
+---------------------+     |  SIM        NAO     |
                            |   |          |      |
                            |   v          v      |
                            | Inativar   Ignorar  |
                            | + liberar  (nao     |
                            | ativos     criar)   |
                            +---------------------+
```

### Mudancas no ImportFuncionariosDialog.tsx

**1. Adicionar contadores para inativados**

Atualizar a interface `ImportResult`:

```typescript
interface ImportResult {
  total: number;
  updated: number;
  created: number;
  skipped: number;
  deactivated: number;  // NOVO
  assetsReleased: number;  // NOVO
  errors: string[];
}
```

**2. Modificar logica de processamento**

Para cada linha do CSV:

```text
1. Verificar se status no CSV = inativo
2. SE inativo:
   a. SE funcionario existe no banco:
      - Marcar funcionario como active=false
      - Buscar assets com funcionario_id = id
      - Atualizar assets: funcionario_id=null, status='disponivel'
      - Buscar linhas_telefonicas com funcionario_id = id  
      - Atualizar linhas: funcionario_id=null
      - Buscar veiculos com funcionario_id = id
      - Atualizar veiculos: funcionario_id=null, status='disponivel'
      - Incrementar contador deactivated
   b. SE funcionario NAO existe:
      - Ignorar (nao criar funcionario inativo)
      - Incrementar contador skipped
3. SE ativo:
   - Manter logica atual (criar ou atualizar)
```

**3. Funcao para liberar ativos de um funcionario**

```typescript
const releaseAssetsFromFuncionario = async (funcionarioId: string) => {
  let releasedCount = 0;
  
  // Liberar assets (notebooks, celulares)
  const { data: assets } = await supabase
    .from('assets')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('active', true);
  
  if (assets && assets.length > 0) {
    await supabase
      .from('assets')
      .update({ funcionario_id: null, status: 'disponivel' })
      .eq('funcionario_id', funcionarioId);
    releasedCount += assets.length;
  }
  
  // Liberar linhas telefonicas
  const { data: linhas } = await supabase
    .from('linhas_telefonicas')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('active', true);
  
  if (linhas && linhas.length > 0) {
    await supabase
      .from('linhas_telefonicas')
      .update({ funcionario_id: null })
      .eq('funcionario_id', funcionarioId);
    releasedCount += linhas.length;
  }
  
  // Liberar veiculos
  const { data: veiculos } = await supabase
    .from('veiculos')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('active', true);
  
  if (veiculos && veiculos.length > 0) {
    await supabase
      .from('veiculos')
      .update({ funcionario_id: null, status: 'disponivel' })
      .eq('funcionario_id', funcionarioId);
    releasedCount += veiculos.length;
  }
  
  return releasedCount;
};
```

**4. Atualizar UI de resultados**

Adicionar card para funcionarios inativados:

| Card | Cor | Icone | Texto |
|------|-----|-------|-------|
| Inativados | Vermelho | UserMinus | "X Inativados (Y ativos liberados)" |

**5. Atualizar invalidacao de queries**

Apos processamento, invalidar tambem:
- `["ativos"]`
- `["linhas-telefonicas"]`  
- `["veiculos"]`

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ImportFuncionariosDialog.tsx` | Adicionar logica de inativacao, liberar ativos, UI atualizada |

### Resultado Esperado

1. Funcionarios inativos no CSV nao serao criados na base
2. Funcionarios existentes marcados como inativos serao desativados
3. Assets, linhas telefonicas e veiculos do funcionario inativado voltam para disponivel
4. Usuario ve resumo claro de quantos foram inativados e quantos ativos liberados
