

# Plano: Compatibilizar Sync GA360 com Tabela `companies`

## Problema

A edge function está tentando acessar a tabela `empresas` no GA360, mas o esquema real usa:

```text
ORIGEM (Ativos Arantes)          DESTINO (GA360)
┌────────────────────┐           ┌────────────────────┐
│ Tabela: empresas   │           │ Tabela: companies  │
├────────────────────┤           ├────────────────────┤
│ nome               │  ──────>  │ name               │
│ cnpj               │  ──────>  │ cnpj               │
│ active             │  ──────>  │ is_active          │
│ logo_url           │  ──────>  │ logo_url           │
│ color              │  ──────>  │ color              │
│ external_id        │  ──────>  │ external_id        │
│ is_auditable       │  ──────>  │ is_auditable       │
│ razao_social       │     X     │ (não existe)       │
│ endereco           │     X     │ (não existe)       │
│ telefone           │     X     │ (não existe)       │
│ email              │     X     │ (não existe)       │
└────────────────────┘           └────────────────────┘
```

## Alterações

### Arquivo: `supabase/functions/sync-to-ga360/index.ts`

**1. Trocar nome da tabela de destino:**
- Linha 89: `.from('empresas')` para `.from('companies')`
- Linha 111-113: `.from('empresas')` para `.from('companies')`
- Linha 124-125: `.from('empresas')` para `.from('companies')`
- Linha 159-163: `.from('empresas')` para `.from('companies')`
- Linha 199-203: `.from('empresas')` para `.from('companies')`

**2. Mapear campos corretamente (linhas 99-107):**

```typescript
// ANTES
const empresaData = {
  nome: empresa.nome,
  razao_social: empresa.razao_social,
  cnpj: empresa.cnpj,
  endereco: empresa.endereco,
  telefone: empresa.telefone,
  email: empresa.email,
  active: empresa.active
};

// DEPOIS
const companyData = {
  name: empresa.nome,
  cnpj: empresa.cnpj,
  is_active: empresa.active ?? true,
  logo_url: empresa.logo_url,
  color: empresa.color,
  external_id: empresa.external_id,
  is_auditable: empresa.is_auditable ?? false
};
```

**3. Atualizar lógica de funcionários para buscar company_id:**

Na seção de funcionários, onde busca empresa por CNPJ, também trocar para `companies`:

```typescript
// Buscar companies por CNPJ no destino
const { data: destCompany } = await targetSupabase
  .from('companies')
  .select('id')
  .eq('cnpj', emp.cnpj)
  .maybeSingle();
```

## Mapeamento Completo de Campos

| Campo Origem | Campo Destino | Observação |
|--------------|---------------|------------|
| nome | name | Obrigatório |
| cnpj | cnpj | Chave de match |
| active | is_active | Default true |
| logo_url | logo_url | Opcional |
| color | color | Opcional |
| external_id | external_id | Opcional |
| is_auditable | is_auditable | Default false |
| razao_social | - | Ignorado (não existe no destino) |
| endereco | - | Ignorado |
| telefone | - | Ignorado |
| email | - | Ignorado |

## Resultado Esperado

Após as alterações, a sincronização mapeará corretamente:

```text
ORIGEM: empresas (12 registros)
   ↓
   ↓  Mapeamento de campos
   ↓
DESTINO: companies (12 registros)
   ✓ name = nome
   ✓ cnpj = cnpj  
   ✓ is_active = active
   ✓ logo_url = logo_url
   ✓ color = color
   ✓ external_id = external_id
   ✓ is_auditable = is_auditable
```

