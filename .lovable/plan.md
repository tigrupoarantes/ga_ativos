
# Plano: Adicionar Campo "É Vendedor" no Cadastro de Funcionários

## Objetivo

Adicionar funcionalidade similar ao campo "É Condutor", onde:
1. Um checkbox "É Vendedor" controla a exibição de campos adicionais
2. Quando marcado, aparece um campo numérico para inserir um código/número do vendedor

## Análise Atual

### Padrão Existente (É Condutor)

| Campo | Tipo | Comportamento |
|-------|------|---------------|
| `is_condutor` | boolean | Checkbox que controla exibição |
| `cnh_numero` | text | Aparece quando is_condutor = true |
| `cnh_categoria` | text | Aparece quando is_condutor = true |
| `cnh_validade` | date | Aparece quando is_condutor = true |

### Nova Estrutura (É Vendedor)

| Campo | Tipo | Comportamento |
|-------|------|---------------|
| `is_vendedor` | boolean | Checkbox que controla exibição |
| `codigo_vendedor` | text | Campo numérico que aparece quando is_vendedor = true |

## Etapas de Implementação

### 1. Migração do Banco de Dados

Adicionar dois novos campos na tabela `funcionarios`:

```sql
ALTER TABLE funcionarios 
ADD COLUMN is_vendedor boolean DEFAULT false,
ADD COLUMN codigo_vendedor text;
```

### 2. Atualizar Formulário (Funcionarios.tsx)

**Estado do formulário** - Adicionar novos campos:
```typescript
const [formData, setFormData] = useState({
  // ... campos existentes
  is_vendedor: false,
  codigo_vendedor: "",
});
```

**Interface do usuário** - Adicionar após o checkbox "É Condutor":
```text
┌─────────────────────────────────────────────────────────┐
│  [x] É condutor                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ CNH Número  │ │ Categoria   │ │ Validade    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
│  [x] É vendedor                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Código do Vendedor (numérico)                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 3. Atualizar Hooks e Tipos

**useFuncionarios.ts** - Incluir novos campos nas queries e mutations

**types/index.ts** - Adicionar campos ao tipo Funcionario

### 4. Atualizar Tabela de Listagem (Opcional)

Adicionar coluna "Vendedor" com badge similar ao "Condutor"

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Criar campos `is_vendedor` e `codigo_vendedor` |
| `src/pages/Funcionarios.tsx` | Formulário, estado, submit, tabela |
| `src/hooks/useFuncionarios.ts` | Incluir campos na query select |
| `src/types/index.ts` | Adicionar ao interface Funcionario |

## Detalhes Técnicos

### Migração SQL

```sql
-- Adicionar campos para funcionalidade "É Vendedor"
ALTER TABLE funcionarios 
ADD COLUMN IF NOT EXISTS is_vendedor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS codigo_vendedor text;

-- Comentário para documentação
COMMENT ON COLUMN funcionarios.is_vendedor IS 'Indica se o funcionário é vendedor';
COMMENT ON COLUMN funcionarios.codigo_vendedor IS 'Código numérico do vendedor';
```

### Formulário (Funcionarios.tsx)

1. **Adicionar ao estado inicial** (linhas 83-95):
```typescript
is_vendedor: false,
codigo_vendedor: "",
```

2. **Adicionar ao resetForm** (linhas 154-169):
```typescript
is_vendedor: false,
codigo_vendedor: "",
```

3. **Adicionar ao handleEdit** (linhas 171-187):
```typescript
is_vendedor: funcionario.is_vendedor || false,
codigo_vendedor: funcionario.codigo_vendedor || "",
```

4. **Adicionar ao dataToSave no handleSubmit** (linhas 125-137):
```typescript
is_vendedor: formData.is_vendedor,
codigo_vendedor: formData.codigo_vendedor || null,
```

5. **Adicionar UI após o bloco "É Condutor"** (após linha 359):
```tsx
<div className="flex items-center space-x-2">
  <Checkbox
    id="is_vendedor"
    checked={formData.is_vendedor}
    onCheckedChange={(checked) => setFormData({ ...formData, is_vendedor: checked as boolean })}
  />
  <Label htmlFor="is_vendedor">É vendedor</Label>
</div>
{formData.is_vendedor && (
  <div className="space-y-2">
    <Label htmlFor="codigo_vendedor">Código do Vendedor</Label>
    <Input
      id="codigo_vendedor"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder="Digite o código numérico"
      value={formData.codigo_vendedor}
      onChange={(e) => {
        // Aceitar apenas números
        const value = e.target.value.replace(/\D/g, '');
        setFormData({ ...formData, codigo_vendedor: value });
      }}
    />
  </div>
)}
```

6. **Adicionar coluna na tabela** (opcional, após "Condutor"):
```tsx
<TableHead>Vendedor</TableHead>
// ...
<TableCell>
  {funcionario.is_vendedor ? (
    <Badge className="bg-green-100 text-green-800">
      Cód: {funcionario.codigo_vendedor || "-"}
    </Badge>
  ) : "-"}
</TableCell>
```

### Hook useFuncionarios.ts

Adicionar campos na query select:
```typescript
.select(`
  id, nome, email, telefone, cargo, departamento, cpf,
  empresa_id, equipe_id, is_condutor,
  cnh_numero, cnh_categoria, cnh_validade,
  is_vendedor, codigo_vendedor,  // NOVO
  empresa:empresas!funcionarios_empresa_id_fkey(id, nome),
  equipe:equipes!funcionarios_equipe_id_fkey(id, nome)
`)
```

### Types (index.ts)

Adicionar ao interface Funcionario:
```typescript
is_vendedor?: boolean;
codigo_vendedor?: string;
```

## Resultado Esperado

Após a implementação:
- Novo checkbox "É Vendedor" aparece no formulário
- Quando marcado, exibe campo para código numérico
- Dados são salvos e recuperados corretamente
- Badge opcional na listagem mostra vendedores com código
