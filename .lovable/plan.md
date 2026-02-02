
# Plano: Adicionar Campo `unidade` na Sincronização de Funcionários

## Problema Identificado

O campo `unidade` na tabela `external_employees` do GA360 não está sendo preenchido durante a sincronização. Este campo deveria conter o **nome da empresa** do funcionário.

## Diagnóstico

| Campo Destino | Status Atual | Ação Necessária |
|---------------|--------------|-----------------|
| `company_id` | Preenchido | Manter (FK para companies) |
| `unidade` | Vazio | Adicionar nome da empresa |

## Dados na Origem

Na tabela `funcionarios`, já buscamos os dados da empresa via JOIN:
```typescript
.select('*, empresas!funcionarios_empresa_id_fkey(cnpj)')
```

Precisamos também buscar o **nome** da empresa:
```typescript
.select('*, empresas!funcionarios_empresa_id_fkey(cnpj, nome)')
```

## Mudança no Código

### Edge Function (`sync-to-ga360/index.ts`)

**1. Atualizar a query de funcionários (linha 224):**
```typescript
// Antes
.select('*, empresas!funcionarios_empresa_id_fkey(cnpj)')

// Depois  
.select('*, empresas!funcionarios_empresa_id_fkey(cnpj, nome)')
```

**2. Adicionar campo `unidade` no mapeamento (linha 283-296):**
```typescript
const employeeData = {
  external_id: func.id,
  source_system: 'gestao_ativos',
  company_id: targetCompanyId,
  unidade: func.empresas?.nome || null,  // NOVO: Nome da empresa
  full_name: func.nome,
  email: func.email,
  phone: func.telefone,
  department: func.departamento,
  position: func.cargo,
  cpf: func.cpf,
  is_active: func.active ?? true,
  is_condutor: func.is_condutor ?? false,
  synced_at: new Date().toISOString()
};
```

## Fluxo Atualizado

```text
┌──────────────────────────────────────────────────────────────────┐
│  ORIGEM (funcionarios)           DESTINO (external_employees)   │
│                                                                  │
│  empresa_id ─────(CNPJ)────────▶ company_id (FK)                │
│  empresas.nome ─────────────────▶ unidade (TEXT)                │
└──────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após a alteração, cada funcionário sincronizado terá:
- `company_id`: UUID da empresa no GA360 (via lookup por CNPJ)
- `unidade`: Nome da empresa (ex: "CHOKDOCE LOJA 2", "DISTRIBUIDORA G4 ARANTES LTDA")

## Arquivo a Modificar

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `supabase/functions/sync-to-ga360/index.ts` | 224, 283-296 | Adicionar nome da empresa na query e no mapeamento |
