
# Plano: Atualizar Sincronização para `external_employees` com Validação de CPF

## Resumo das Mudanças

Atualizar a sincronização de funcionários para usar a tabela `external_employees` no GA360, com deduplicação por CPF para evitar registros duplicados.

## Estratégia de Deduplicação

A tabela `external_employees` possui:
1. **Constraint única composta**: `(company_id, external_id, source_system)` 
2. **Necessidade adicional**: CPF não pode repetir

**Solução**: Buscar registro existente por CPF primeiro. Se existir, atualiza. Se não existir, insere novo.

```text
┌─────────────────────────────────────────────────────────────────┐
│  Verificação de Duplicata                                       │
│                                                                 │
│  1. Buscar por CPF na tabela external_employees                 │
│     SELECT id FROM external_employees WHERE cpf = ?             │
│                                                                 │
│  2. Se encontrou → UPDATE                                       │
│     Se não encontrou → INSERT                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Mapeamento de Campos Atualizado

| Campo Origem (`funcionarios`) | Campo Destino (`external_employees`) | Notas |
|-------------------------------|--------------------------------------|-------|
| `id` | `external_id` | UUID original como referência |
| `empresa_id` (via CNPJ) | `company_id` | FK para companies |
| `nome` | `full_name` | Nome completo |
| `email` | `email` | - |
| `telefone` | `phone` | - |
| `departamento` | `department` | - |
| `cargo` | `position` | - |
| `cpf` | `cpf` | Chave de deduplicação |
| `active` | `is_active` | Status ativo |
| `is_condutor` | `is_condutor` | Flag condutor |
| - | `source_system` | Fixo: `'gestao_ativos'` |
| - | `synced_at` | Timestamp da sincronização |

## Mudanças no Código

### Edge Function (`sync-to-ga360/index.ts`)

**Seção de funcionários (linhas 270-320) - Alterações:**

1. Trocar tabela `funcionarios` → `external_employees`
2. Buscar existente por CPF (mantém lógica atual)
3. Ajustar objeto de dados para novo schema:

```typescript
// Verificar por CPF (mesmo que tabela anterior)
const { data: existingFunc } = await targetSupabase
  .from('external_employees')  // ← Tabela nova
  .select('id')
  .eq('cpf', func.cpf)
  .maybeSingle();

// Novo mapeamento de campos
const employeeData = {
  external_id: func.id,           // ID original como referência
  source_system: 'gestao_ativos', // Identificador fixo
  company_id: targetCompanyId,    // FK para companies
  full_name: func.nome,           // ← nome → full_name
  email: func.email,
  phone: func.telefone,           // ← telefone → phone  
  department: func.departamento,  // ← departamento → department
  position: func.cargo,           // ← cargo → position
  cpf: func.cpf,
  is_active: func.active ?? true, // ← active → is_active
  is_condutor: func.is_condutor ?? false,
  synced_at: new Date().toISOString()  // ← Novo campo
};

// UPDATE ou INSERT na tabela nova
if (existingFunc) {
  await targetSupabase
    .from('external_employees')
    .update(employeeData)
    .eq('id', existingFunc.id);
} else {
  await targetSupabase
    .from('external_employees')
    .insert(employeeData);
}
```

## Fluxo de Processamento

```text
Para cada funcionário origem:
│
├─ Tem CPF? ──────────────────── Não → Ignora (erro no log)
│      │
│      ▼ Sim
├─ Resolve company_id via CNPJ
│      │
│      ▼
├─ Busca por CPF no destino
│      │
│      ├─ Encontrou → UPDATE external_employees
│      │
│      └─ Não encontrou → INSERT external_employees
│
└─ Próximo funcionário
```

## Arquivo a Modificar

| Arquivo | Linhas | Mudança |
|---------|--------|---------|
| `supabase/functions/sync-to-ga360/index.ts` | 270-320 | Trocar tabela e mapeamento de campos |

## Validações Mantidas

- Funcionários sem CPF são ignorados
- Funcionários sem empresa resolvida terão `company_id: null` (permitido pelo schema)
- Erros individuais não interrompem o processamento
