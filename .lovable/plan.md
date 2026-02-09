

# Plano: Alinhar Identidade Visual com o Padrao GA360

## Resumo

O app ja possui boa parte da base de design (cores HSL, glassmorphism, animacoes, tipografia Apple). A documentacao descreve um layout com **AppleNav horizontal fixa no topo** + **barra de empresa**, enquanto o app atual usa um **sidebar lateral fixa**. Como o sidebar lateral ja e o padrao consolidado deste app, o foco sera alinhar os **componentes visuais** (cards admin, badges de status, KPIs, animacoes staggered) sem alterar a estrutura de navegacao.

---

## Itens que ja estao alinhados (nenhuma acao necessaria)

- Paleta de cores HSL (primary violet, accent, etc.)
- Tipografia `-apple-system`
- `--radius: 0.75rem`
- Glassmorphism (`.glass`, `.glass-card`)
- Animacoes (`animate-fade-in`, `animate-scale-in`, `animate-slide-up`, stagger classes)
- Hover effects (`.hover-scale`, `.hover-lift`, `.card-hover`)
- BugReportDialog ja implementado
- Botao Bug no header ja implementado

---

## Itens a implementar

### 1. AdminBugReports - Alinhar visual dos KPIs e status badges

**Arquivo**: `src/pages/AdminBugReports.tsx`

Ajustes:
- **KPI cards**: Adicionar icone com fundo colorido (ex: `h-12 w-12 rounded-lg bg-yellow-500/10`) conforme documentacao
- **Status badges**: Trocar as variants do shadcn Badge por classes customizadas com cores semi-transparentes conforme a doc:
  - `aberto` -> `bg-yellow-500/10 text-yellow-700 dark:text-yellow-300`
  - `em_analise` -> `bg-blue-500/10 text-blue-700 dark:text-blue-300`
  - `resolvido` -> `bg-green-500/10 text-green-700 dark:text-green-300`
  - `recusado` -> `bg-red-500/10 text-red-700 dark:text-red-300`
- **Animacoes staggered** nos KPI cards: `animate-fade-in-up` com `animationDelay` incremental
- **Animacao na tabela**: `animate-fade-in` no card da tabela

### 2. AdminBugReports - Alinhar badges de prioridade

Usar o mesmo padrao de cores semi-transparentes:
- `baixa` -> `bg-muted text-muted-foreground`
- `media` -> `bg-yellow-500/10 text-yellow-700`
- `alta` -> `bg-orange-500/10 text-orange-700`
- `critica` -> `bg-red-500/10 text-red-700`

### 3. Configuracoes - Alinhar visual da secao Bugs na aba Notificacoes

**Arquivo**: `src/pages/Configuracoes.tsx`

- Aplicar os mesmos badges de status customizados (cores semi-transparentes) na tabela de reports do usuario
- Adicionar animacao `animate-fade-in` nos cards

### 4. Rota admin/bugs - Restaurar acesso via rota dedicada

**Arquivos**: `src/App.tsx`, `src/components/AppLayout.tsx`

A documentacao mostra "Bugs e Melhorias" como card no painel Admin (com icone vermelho `bg-red-500/10`). Precisamos:
- Restaurar a rota `/admin/bugs` em `App.tsx`
- Adicionar item "Bugs e Melhorias" no sidebar sob "Administracao" em `AppLayout.tsx`
- O card de admin seguiria o padrao visual: icone com fundo colorido, titulo, descricao, link "Gerenciar"

### 5. Cards admin na pagina de Configuracoes - Padrao visual

Alinhar os cards de links (Permissoes, Usuarios) na aba "Seguranca" com o padrao documentado:
- Icone com fundo colorido (`h-12 w-12 rounded-lg bg-primary/10`)
- Hover com `card-hover` (lift + shadow)
- Texto "Gerenciar" como link visual

---

## Detalhes tecnicos

### Arquivos a modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/AdminBugReports.tsx` | KPIs com icone colorido, badges customizados, animacoes staggered |
| `src/pages/Configuracoes.tsx` | Badges de status alinhados, animacoes |
| `src/App.tsx` | Restaurar rota `/admin/bugs` |
| `src/components/AppLayout.tsx` | Adicionar item "Bugs e Melhorias" no admin sidebar |

### Nenhum arquivo novo sera criado

### Nenhuma alteracao de banco de dados necessaria

---

## Resultado esperado

- KPIs do AdminBugReports com icones em fundo semi-transparente colorido
- Badges de status e prioridade com cores consistentes entre GA360 e este app
- Animacoes staggered nos cards
- Acesso ao painel admin de bugs via sidebar
- Visual coeso seguindo o padrao Apple-inspired documentado

