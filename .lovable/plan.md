
## Plano: Página de Relatórios com Chat de IA

### Objetivo

Criar uma nova página `/relatorios` com uma interface de chat onde os usuários podem fazer perguntas em linguagem natural sobre os dados do sistema. A IA irá consultar o banco de dados e retornar respostas personalizadas.

---

### Exemplos de Perguntas que o Usuário Poderá Fazer

- "Quantos veículos estão em manutenção?"
- "Qual o valor total da frota FIPE?"
- "Quais funcionários têm CNH vencida?"
- "Liste os contratos que vencem este mês"
- "Qual veículo teve mais ordens de serviço?"
- "Quanto gastamos em peças nos últimos 3 meses?"

---

### Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Página de Relatórios (/relatorios)                 │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │  Chat Interface                               │  │   │
│  │  │  - Input de mensagem                          │  │   │
│  │  │  - Lista de mensagens (user/assistant)        │  │   │
│  │  │  - Renderização com Markdown                  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Edge Function (reports-chat)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Recebe pergunta do usuário                      │   │
│  │  2. Consulta dados relevantes no Supabase           │   │
│  │  3. Monta contexto com dados reais                  │   │
│  │  4. Envia para Lovable AI (Gemini Flash)            │   │
│  │  5. Retorna resposta formatada (streaming)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Lovable AI Gateway                             │
│  - Modelo: google/gemini-3-flash-preview                   │
│  - Streaming habilitado                                     │
│  - Resposta em Português                                    │
└─────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/Relatorios.tsx` | Página com interface de chat |
| `src/components/ReportsChat.tsx` | Componente do chat |
| `src/hooks/useReportsChat.ts` | Hook para gerenciar streaming |
| `supabase/functions/reports-chat/index.ts` | Edge function para IA |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/App.tsx` | Adicionar rota `/relatorios` |
| `src/components/AppLayout.tsx` | Adicionar item no menu |
| `supabase/config.toml` | Registrar edge function |

---

### Detalhes Técnicos

#### 1. Edge Function `reports-chat`

A function irá:
1. Receber a pergunta do usuário
2. Consultar TODOS os dados relevantes do banco antes de chamar a IA
3. Montar um contexto rico com estatísticas e dados
4. Enviar para o Lovable AI com streaming

```typescript
// Consultas executadas na edge function:
const queries = {
  veiculos: supabase.from("veiculos").select("*").eq("active", true),
  funcionarios: supabase.from("funcionarios").select("*").eq("active", true),
  assets: supabase.from("assets").select("*").eq("active", true),
  contratos: supabase.from("contratos").select("*").eq("active", true),
  ordens_servico: supabase.from("ordens_servico").select("*"),
  pecas: supabase.from("pecas").select("*").eq("active", true),
  preventivas: supabase.from("preventivas").select("*"),
};

// Monta contexto para a IA
const context = `
Você é um assistente de relatórios do sistema de gestão de ativos.

DADOS DO SISTEMA:
- Total de veículos: ${veiculos.length}
- Veículos por status: ${JSON.stringify(statusCount)}
- Valor total FIPE da frota: R$ ${totalFipe}
...
`;
```

#### 2. Interface do Chat

- Design limpo e moderno
- Input fixo na parte inferior
- Mensagens com scroll automático
- Suporte a Markdown nas respostas
- Indicador de "digitando..."
- Botões de sugestões de perguntas iniciais

#### 3. Streaming de Respostas

Implementar streaming para UX fluida:
- Token a token
- Sem buffering
- Cancelamento de request

---

### Layout da Página

```text
┌────────────────────────────────────────────────────────┐
│  Header: Relatórios IA                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  [Sugestões iniciais - botões clicáveis]         │ │
│  │  "Quantos veículos temos?"                       │ │
│  │  "Qual o valor total da frota?"                  │ │
│  │  "CNHs vencendo este mês?"                       │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Área de mensagens (scroll)                      │ │
│  │                                                  │ │
│  │  👤 Quantos veículos estão em manutenção?        │ │
│  │                                                  │ │
│  │  🤖 Atualmente, você possui **3 veículos** em    │ │
│  │     manutenção:                                  │ │
│  │     - ABC-1234 (Fiat Strada)                     │ │
│  │     - XYZ-5678 (VW Gol)                          │ │
│  │     - DEF-9012 (Ford Ka)                         │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  [Input] Digite sua pergunta...        [Enviar]  │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

### Prompt do Sistema para a IA

```text
Você é um assistente de relatórios do Sistema de Gestão de Ativos.
Responda APENAS com base nos dados fornecidos no contexto.
Suas respostas devem ser:
- Em português brasileiro
- Claras e objetivas
- Formatadas em Markdown quando apropriado
- Com números precisos baseados nos dados

Se não tiver dados suficientes para responder, informe educadamente.

DADOS ATUAIS DO SISTEMA:
[contexto dinâmico com dados do banco]
```

---

### Segurança

- A edge function usa `verify_jwt = true` (requer autenticação)
- Dados são filtrados por `active = true`
- Não expõe informações sensíveis (senhas, tokens)
- Rate limiting via Lovable AI Gateway

---

### Dependências

Será necessário instalar `react-markdown` para renderizar as respostas:

```bash
npm install react-markdown
```

---

### Menu de Navegação

Adicionar no menu lateral:
- Ícone: `MessageSquare` (lucide-react)
- Label: "Relatórios IA"
- Path: `/relatorios`
- Module: `relatorios` (para permissões)

---

### Fluxo Completo

```text
1. Usuário acessa /relatorios
           ↓
2. Vê sugestões de perguntas
           ↓
3. Clica ou digita pergunta
           ↓
4. Frontend envia para edge function
           ↓
5. Edge function consulta banco
           ↓
6. Monta contexto com dados reais
           ↓
7. Envia para Lovable AI (streaming)
           ↓
8. Frontend renderiza token a token
           ↓
9. Usuário vê resposta completa
```
