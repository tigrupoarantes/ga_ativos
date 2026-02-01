

# Correção: Estrutura Organizacional Substitui Cadastro de Empresas

## Problema Atual

1. **Em Configurações (aba Geral)**: Existe `EmpresasInlineManager` - um CRUD inline de empresas
2. **No menu Pessoas**: "Estrutura Organizacional" foi adicionada incorretamente

## Solução

A "Estrutura Organizacional" é a nova forma de cadastrar empresas e áreas, portanto:

1. **Remover** o componente `EmpresasInlineManager` da página de Configurações
2. **Adicionar** um card/link em Configurações que redireciona para `/estrutura-organizacional`
3. **Mover** "Estrutura Organizacional" do grupo "Pessoas" para a seção "Administração" no menu lateral

---

## Alterações

### 1. Arquivo: `src/pages/Configuracoes.tsx`

**Remover:**
- Import do `EmpresasInlineManager`
- Uso do componente `{isAdmin && <EmpresasInlineManager />}` na aba Geral

**Adicionar:**
- Import do `Building2` icon (já existe)
- Card com link para `/estrutura-organizacional` na aba Geral (para admins)

```
Nova estrutura da aba Geral:
┌─────────────────────────────────────────────────────┐
│  Preferências Gerais                                │
│  - Tema Escuro                                      │
│  - Exibição Compacta                                │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  🏢 Estrutura Organizacional              [→]       │
│  Gerencie empresas e áreas do Grupo                 │
│  (Card clicável que redireciona)                    │
└─────────────────────────────────────────────────────┘
```

### 2. Arquivo: `src/components/AppLayout.tsx`

**Remover** de `navStructure` (grupo Pessoas):
```typescript
{ icon: Building2, label: "Estrutura Organizacional", path: "/estrutura-organizacional", module: "funcionarios" }
```

**Adicionar** em `adminItems`:
```typescript
{ icon: Building2, label: "Estrutura Organizacional", path: "/estrutura-organizacional", module: "admin" }
```

**Nova estrutura do menu:**
```
- Dashboard
- Patrimônio
  - Ativos
  - Tipos de Ativos
- Pessoas
  - Funcionários          ← Apenas funcionários
- Frota
  - Veículos
  - Oficina
- Telefonia
- Relatórios IA
- Histórico
- Contratos
─────────────────────────
ADMINISTRAÇÃO
- Estrutura Organizacional  ← Movido para cá
- Usuários
- Permissões
- Configurações
```

### 3. Arquivo: `src/components/EmpresasInlineManager.tsx`

**Manter** o arquivo (pode ser útil futuramente ou para outros contextos), mas não será mais usado em Configurações.

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `src/pages/Configuracoes.tsx` | Substituir `EmpresasInlineManager` por card com link |
| `src/components/AppLayout.tsx` | Mover item do grupo "Pessoas" para "Administração" |

