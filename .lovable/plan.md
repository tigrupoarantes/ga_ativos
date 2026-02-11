

# Formulário Dedicado para Coletores de Dados

## Problema Atual
O formulário de itens do contrato é genérico -- usa campos como "Identificador" e "Descrição" que não refletem o modelo de gestão de coletores de dados. Além disso, não existe o rateio automático por empresa baseado nos funcionários atribuídos.

## O que muda para o usuário

1. **Formulário simplificado**: campos Modelo, Número de Série e Valor Mensal
2. **Rateio automático por empresa**: card mostrando quanto cada empresa paga, calculado pela soma dos valores mensais dos equipamentos cujos funcionários pertencem a cada empresa
3. **Coluna "Empresa" na tabela** derivada do funcionário atribuído (sem campo manual)
4. **Título "Coletores de Dados"** em vez de "Itens do Contrato"

## Detalhes Técnicos

### 1. SQL no banco externo (ação manual do usuário)
```sql
ALTER TABLE public.contrato_itens ADD COLUMN IF NOT EXISTS modelo TEXT;
NOTIFY pgrst, 'reload schema';
```

### 2. Atualizar `src/hooks/useContratoItens.ts`
- Adicionar `modelo: string | null` na interface `ContratoItem`
- Adicionar `modelo` no `CreateItemData`
- Remover `empresa_id` do payload de criação (empresa vem do funcionário)

### 3. Refatorar `src/components/contratos/ContratoItens.tsx`

**Formulário** -- substituir campos atuais por:
- Modelo (texto, ex: "Honeywell CT60")
- Número de Série (usa campo `identificador`)
- Valor Mensal (R$)
- Responsável (FuncionarioCombobox, opcional)
- Observações (opcional)
- Remover campo "Empresa" e "Descrição" do formulário

**Tabela** -- colunas:
| Modelo | N. Série | Responsável | Empresa | Valor Mensal | Status | Ações |

A coluna "Empresa" busca o `empresa_id` do funcionário atribuído e exibe o nome. Sem funcionário exibe "-".

**Título da seção**: "Coletores de Dados" em vez de "Itens do Contrato"

**Botão**: "Novo Coletor" em vez de "Adicionar Item"

### 4. Novo card: Rateio por Empresa
Abaixo dos KPIs, um card com mini-tabela:

| Empresa | Qtd Equipamentos | Valor Mensal |
|---------|-------------------|--------------|
| Arantes Alimentos | 5 | R$ 750,00 |
| Arantes Logística | 3 | R$ 450,00 |
| Sem atribuição | 2 | R$ 300,00 |
| **Total** | **10** | **R$ 1.500,00** |

Lógica: para cada item com `funcionario_id`, busca o `empresa_id` do funcionário, agrupa por empresa e soma `valor_mensal`. Itens sem funcionário vão para "Sem atribuição".

### 5. Mensagens de toast atualizadas
- "Coletor adicionado!" / "Coletor atualizado!" / "Coletor removido!" / "Coletor atribuído!" / "Coletor devolvido!"

### Arquivos afetados
- `src/hooks/useContratoItens.ts`
- `src/components/contratos/ContratoItens.tsx`

