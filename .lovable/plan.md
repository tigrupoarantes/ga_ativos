

# Plano: Adicionar Contratos ao Menu Lateral

## Problema Identificado

A página de Contratos (`/contratos`) existe e está funcional, mas não aparece no menu lateral porque não foi adicionada ao array `navStructure` no `AppLayout.tsx`.

---

## Solução

Adicionar o item "Contratos" ao menu lateral como um item independente, logo após "Histórico", já que é um módulo de gestão financeira/administrativa que não se encaixa nos grupos existentes (Patrimônio, Pessoas, Frota).

---

## Estrutura Proposta do Menu

```text
Menu Lateral (Sidebar)
├── Dashboard
├── Patrimônio (grupo colapsável)
│   ├── Ativos
│   └── Tipos de Ativos
├── Pessoas (grupo colapsável)
│   ├── Funcionários
│   └── Equipes
├── Frota (grupo colapsável)
│   ├── Veículos
│   └── Oficina
├── Telefonia
├── Relatórios IA
├── Histórico
├── Contratos  ← NOVO ITEM AQUI
│
└── ADMINISTRAÇÃO (seção de admin)
    ├── Usuários
    ├── Permissões
    └── Configurações
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AppLayout.tsx` | Adicionar item "Contratos" ao array `navStructure` |

---

## Mudança Específica

Adicionar na linha 127 (após "Histórico"):

```typescript
const navStructure: NavEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  // ... grupos existentes ...
  { icon: Phone, label: "Telefonia", path: "/linhas-telefonicas", module: "telefonia" },
  { icon: MessageSquare, label: "Relatórios IA", path: "/relatorios", module: "relatorios" },
  { icon: History, label: "Histórico", path: "/historico", module: "historico" },
  { icon: FileText, label: "Contratos", path: "/contratos", module: "contratos" }, // NOVO
];
```

---

## Permissões

O item usará o módulo `contratos` para controle de acesso. Se o módulo não existir na tabela `permissoes`, administradores ainda verão o item. Para usuários não-admin, será necessário conceder permissão ao módulo `contratos`.

---

## Resultado Esperado

1. Item "Contratos" visível no menu lateral (ícone de documento)
2. Link funcional para `/contratos`
3. Acesso controlado por permissões de módulo
4. Destaque visual quando ativo

