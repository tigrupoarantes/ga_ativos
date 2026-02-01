
# Plano: Integrar Estrutura Organizacional em Configurações

## Problema Atual

Hoje existe fricção desnecessária para acessar a gestão de empresas:

```text
Configurações → Aba "Geral" → Card "Estrutura Organizacional" → Clique → Nova página

Total: 4 cliques para chegar à funcionalidade
```

O card atual é apenas um atalho que adiciona uma etapa extra na jornada do usuário.

## Solução Proposta

Mover toda a funcionalidade diretamente para dentro de Configurações, em uma nova aba dedicada:

```text
Configurações → Aba "Empresas" → Gestão completa

Total: 2 cliques
```

## Arquitetura da Mudança

```text
ANTES                                    DEPOIS
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│ Configurações                   │     │ Configurações                   │
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ [Geral] [Notific...] [Seguran..]│     │ [Geral] [Empresas] [Notific...]│
├─────────────────────────────────┤     ├─────────────────────────────────┤
│ Preferências Gerais             │     │ Busca    [+ Nova Empresa]       │
│ ──────────────────────          │     │ ────────────────────────        │
│ Estrutura Organizacional   →    │     │ ┌──────┐ ┌──────┐ ┌──────┐     │
│ (atalho para outra página)      │     │ │Card 1│ │Card 2│ │Card 3│     │
│                                 │     │ └──────┘ └──────┘ └──────┘     │
└─────────────────────────────────┘     └─────────────────────────────────┘
         ↓ clique                                (tudo inline)
┌─────────────────────────────────┐
│ Estrutura Organizacional        │
│ (página separada)               │
└─────────────────────────────────┘
```

## Alterações Técnicas

### 1. Atualizar `src/pages/Configuracoes.tsx`

| Acao | Descrição |
|------|-----------|
| Adicionar imports | `useEmpresas`, `CompanyCard`, `CompanyFormDialog`, `ConfirmDeleteDialog`, `Input`, `Skeleton`, `Search`, `Plus` |
| Adicionar state | Estados para busca, dialogs de empresa (criar/editar/excluir) |
| Nova aba "Empresas" | `<TabsTrigger value="empresas">` visível apenas para admins |
| Conteúdo da aba | Grid de `CompanyCard` + barra de busca + botão "Nova Empresa" |
| Remover atalho | Eliminar o card `<Link to="/estrutura-organizacional">` da aba Geral |

### 2. Atualizar `src/App.tsx`

| Acao | Descrição |
|------|-----------|
| Remover import | `EstruturaOrganizacional` |
| Remover rota | `/estrutura-organizacional` |

### 3. Excluir arquivo

| Arquivo | Acao |
|---------|------|
| `src/pages/EstruturaOrganizacional.tsx` | Deletar (código será movido para Configurações) |

## Resultado para o Usuário

| Métrica | Antes | Depois |
|---------|-------|--------|
| Cliques para gerenciar empresas | 4 | 2 |
| Páginas envolvidas | 2 | 1 |
| Contexto perdido ao navegar | Sim | Não |

O usuário permanece em Configurações durante toda a operação, mantendo o contexto e reduzindo a carga cognitiva conforme a filosofia de simplicidade do projeto.
