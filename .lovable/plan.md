
# Plano: Reorganização de Configurações WhatsApp e Menu de Administração

## Resumo

Vamos reorganizar a estrutura de navegação para:
1. Adicionar configuração de credenciais WhatsApp dentro da página de Configurações
2. Mover o item "Configurações" para dentro da seção "Administração" no menu lateral
3. Tornar ambos visíveis apenas para administradores

A **Central de Notificações** (`/oficina/notificacoes`) permanece no módulo Oficina pois é uma ferramenta operacional (monitoramento de fila, envio de mensagens), não configuração.

---

## Arquitetura Proposta

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
│   └── Oficina (inclui Central de Notificações como submenu)
├── Telefonia
├── Relatórios IA
├── Histórico
│
└── ADMINISTRAÇÃO (seção de admin - visível apenas para admins)
    ├── Usuários
    ├── Permissões
    └── Configurações ← MOVIDO PARA CÁ
```

---

## Mudanças na Página de Configurações

### Nova aba "Integrações" (apenas para admins)

Dentro de `/configuracoes`, adicionaremos uma nova aba chamada **"Integrações"** que conterá:

1. **Configuração SMTP** (já existente, movido do "Sistema")
2. **Configuração WhatsApp** (NOVO)
   - Campo para WHATSAPP_ACCESS_TOKEN
   - Campo para WHATSAPP_PHONE_NUMBER_ID  
   - Botão de teste de conexão
   - Instruções de como obter as credenciais

```text
Configurações (apenas admins)
├── Geral (preferências pessoais + gestão de empresas)
├── Notificações (preferências de alertas)
├── Segurança (links para Permissões e Usuários)
├── Sistema (modo manutenção, logs)
└── Integrações (SMTP + WhatsApp) ← NOVA ABA
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AppLayout.tsx` | Mover "Configurações" de item normal para dentro da seção "Administração" |
| `src/pages/Configuracoes.tsx` | Adicionar aba "Integrações" com form de configuração WhatsApp |
| `src/components/WhatsAppConfigForm.tsx` | NOVO - Componente de configuração de credenciais WhatsApp |

---

## Detalhes Técnicos

### 1. Modificação do Menu Lateral (AppLayout.tsx)

**Antes:**
```typescript
const navStructure: NavEntry[] = [
  // ... outros itens
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "configuracoes" },
];

const adminItems: NavItem[] = [
  { icon: UserCog, label: "Usuários", path: "/usuarios", module: "admin" },
  { icon: Shield, label: "Permissões", path: "/permissoes", module: "admin" },
];
```

**Depois:**
```typescript
const navStructure: NavEntry[] = [
  // ... outros itens (SEM Configurações)
];

const adminItems: NavItem[] = [
  { icon: UserCog, label: "Usuários", path: "/usuarios", module: "admin" },
  { icon: Shield, label: "Permissões", path: "/permissoes", module: "admin" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "admin" }, // ADICIONADO
];
```

### 2. Nova Aba "Integrações" em Configurações

A aba conterá:
- **SmtpConfigForm** (movido de "Sistema")
- **WhatsAppConfigForm** (novo componente)

O formulário de WhatsApp irá:
1. Verificar se os secrets já estão configurados via edge function
2. Permitir entrada de novos valores
3. Testar a conexão com a API do WhatsApp
4. Salvar via backend (edge function que atualiza secrets)

### 3. Novo Componente WhatsAppConfigForm

```typescript
// src/components/WhatsAppConfigForm.tsx
export const WhatsAppConfigForm = React.forwardRef<HTMLDivElement, object>(
  function WhatsAppConfigForm(_props, ref) {
    // Form para:
    // - WHATSAPP_ACCESS_TOKEN (campo password/masked)
    // - WHATSAPP_PHONE_NUMBER_ID (campo texto)
    // - Botão "Testar Conexão"
    // - Instruções com link para Meta Business Suite
  }
);
```

### 4. Proteção de Acesso

A página de Configurações já verifica `isAdmin` para mostrar abas restritas:

```typescript
const isAdmin = userRole === "admin" || userRole === "diretor";
```

Com a mudança no menu, apenas admins verão o item Configurações na seção Administração.

---

## Fluxo de Configuração de WhatsApp

1. Admin acessa Configurações → Integrações
2. Vê status atual (configurado/não configurado)
3. Insere credenciais do Meta Business Suite
4. Clica em "Testar Conexão"
5. Sistema valida via edge function
6. Credenciais são salvas como secrets

---

## O Que NÃO Muda

- **Central de Notificações** (`/oficina/notificacoes`) continua no módulo Oficina
  - É uma ferramenta operacional para monitorar fila e executar envios
  - Não é configuração de sistema
  
- **Fluxo de envio de WhatsApp** permanece igual
  - Edge functions `whatsapp-send` e `workshop-scheduler`
  - Tabela `notification_jobs`

---

## Resultado Esperado

1. Menu lateral mais organizado com seção Administração consolidada
2. Configurações de integrações (SMTP + WhatsApp) centralizadas
3. Apenas administradores veem e acessam Configurações
4. Central de Notificações permanece acessível na Oficina para operação do dia-a-dia
