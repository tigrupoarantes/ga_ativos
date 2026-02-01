
# Correção: Remover Estrutura Organizacional do Menu Lateral

## O que foi esquecido

No arquivo `src/components/AppLayout.tsx`, duas referências à rota removida ainda existem:

| Linha | Código | Ação |
|-------|--------|------|
| 59 | `"/estrutura-organizacional": { label: "Estrutura Organizacional", parent: "/" }` | Remover |
| 133 | `{ icon: Building2, label: "Estrutura Organizacional", path: "/estrutura-organizacional", module: "admin" }` | Remover |

## Alterações

### Arquivo: `src/components/AppLayout.tsx`

**1. Remover do `routeConfig` (linha 59):**
```typescript
// REMOVER esta linha:
"/estrutura-organizacional": { label: "Estrutura Organizacional", parent: "/" },
```

**2. Remover do `adminItems` (linha 133):**
```typescript
// ANTES (linhas 131-137):
const adminItems: NavItem[] = [
  { icon: Building2, label: "Estrutura Organizacional", path: "/estrutura-organizacional", module: "admin" },
  { icon: UserCog, label: "Usuários", path: "/usuarios", module: "admin" },
  { icon: Shield, label: "Permissões", path: "/permissoes", module: "admin" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "admin" },
];

// DEPOIS (linhas 131-136):
const adminItems: NavItem[] = [
  { icon: UserCog, label: "Usuários", path: "/usuarios", module: "admin" },
  { icon: Shield, label: "Permissões", path: "/permissoes", module: "admin" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "admin" },
];
```

**3. Remover import não utilizado (linha 25):**
```typescript
// Se Building2 não for mais usado em nenhum outro lugar, remover da linha de imports
```

## Resultado

O menu lateral de Administração terá apenas 3 itens:
- Usuários
- Permissões
- Configurações

A gestão de empresas agora é acessada via **Configurações → Aba "Empresas"**.
