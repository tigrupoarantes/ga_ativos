# Multiagentes de Desenvolvimento

Este documento define um modelo de trabalho com multiagentes para evoluir o app com mais velocidade e menos retrabalho.

O foco aqui não é o runtime de IA do produto. O foco é o time de desenvolvimento usando agentes especializados para implementar novas funcionalidades no repositório.

## 1. Objetivo

Usar agentes especializados para:

- dividir trabalho por responsabilidade técnica;
- reduzir conflitos entre frontend, backend e banco;
- acelerar análise, implementação, revisão e testes;
- preparar novas atualizações com menos risco operacional.

## 2. Quando usar multiagentes

Usar multiagentes quando a demanda envolver pelo menos duas destas áreas:

- UI/frontend;
- hooks e consumo de dados;
- Edge Functions / backend;
- migrations / banco / RLS;
- testes / validação / revisão.

Se a mudança for pequena e localizada em um arquivo ou fluxo simples, vale mais manter em agente único.

## 3. Arquitetura de trabalho recomendada

### 3.1 Agente coordenador

Responsável por:

- entender a demanda;
- quebrar em tarefas menores;
- distribuir por domínio;
- integrar resultados;
- validar riscos e regressões;
- consolidar a entrega final.

O coordenador não deve fazer tudo sozinho. Ele decide sequência, ownership e handoff.

### 3.2 Agentes especialistas

Papéis recomendados para este projeto:

- `planner-produto`
- `frontend-ui`
- `frontend-dados`
- `backend-edge`
- `database-migrations`
- `qa-review`
- `security-appsec`

## 4. Catálogo de agentes

### 4.1 `planner-produto`

Missão:

- transformar pedido em escopo executável;
- definir impacto em rotas, tabelas, funções e regras;
- apontar dependências e critérios de aceite.

Usar quando:

- a funcionalidade ainda está ambígua;
- há dependência entre módulos;
- precisamos evitar começar por um ponto errado.

### 4.2 `frontend-ui`

Missão:

- implementar telas, componentes e fluxos visuais;
- preservar padrão visual atual;
- garantir responsividade e feedback de loading/erro/sucesso.

Ownership típico:

- `src/pages/*`
- `src/components/*`
- ajustes de navegação e layouts.

### 4.3 `frontend-dados`

Missão:

- implementar hooks, cache, mutations e integração com Supabase/Edge Functions;
- padronizar contratos de request/response;
- reduzir duplicação de lógica no cliente.

Ownership típico:

- `src/hooks/*`
- `src/lib/*`
- `src/integrations/*`

### 4.4 `backend-edge`

Missão:

- implementar Edge Functions;
- extrair helpers compartilhados;
- organizar tools, roteamento e tratamento de erro;
- proteger fluxos com confirmação e auditoria.

Ownership típico:

- `supabase/functions/*`

### 4.5 `database-migrations`

Missão:

- criar migrations seguras;
- revisar índices, constraints e RLS;
- garantir compatibilidade com código já existente;
- preparar rollback lógico quando possível.

Ownership típico:

- `supabase/migrations/*`
- `docs/migration/*` quando necessário.

### 4.6 `qa-review`

Missão:

- revisar consistência da solução;
- buscar regressões e falhas de integração;
- validar cenários críticos;
- indicar gaps de teste e observabilidade.

Ownership típico:

- leitura transversal do repo;
- testes, checklists e revisão final.

### 4.7 `security-appsec`

Missão:

- atuar como especialista de segurança da informação em aplicações;
- revisar o app com mentalidade defensiva e adversarial controlada;
- encontrar vulnerabilidades técnicas e riscos de engenharia social no produto.

Ownership típico:

- leitura transversal do repositório;
- foco em `supabase/functions`, `supabase/migrations`, auth, RLS, secrets, uploads e fluxos críticos.

Usar quando:

- a feature mexe com autenticação, permissões, dados sensíveis ou automações;
- houver upload/importação de arquivos;
- existir ação automatizada com impacto no banco;
- quisermos revisão de risco antes de deploy.

## 5. Sequência ideal de trabalho

Para uma funcionalidade nova, a sequência recomendada é:

1. `planner-produto`
2. `database-migrations`
3. `backend-edge`
4. `frontend-dados`
5. `frontend-ui`
6. `qa-review`
7. `security-appsec`

Nem toda demanda precisa de todos os agentes.

## 6. Regras de handoff

Cada agente deve entregar:

- o que mudou;
- quais arquivos tocou;
- o que ficou pendente;
- riscos conhecidos;
- como outro agente continua dali.

Formato recomendado:

```text
Contexto:
Mudanças realizadas:
Arquivos afetados:
Pendências:
Riscos:
Próximo agente recomendado:
```

## 7. Regras para evitar conflito

- Um agente por write set principal.
- Não editar a mesma área em paralelo sem necessidade.
- `database-migrations` não deve assumir comportamento de UI.
- `frontend-ui` não deve inventar contrato de backend sem alinhar com `frontend-dados` ou `backend-edge`.
- `backend-edge` não deve criar schema novo sem alinhar com `database-migrations`.
- `qa-review` não reescreve solução; ele aponta problemas e riscos.
- `security-appsec` não deve ser chamado só no fim; em fluxos sensíveis ele entra antes da entrega final.

## 8. Modelos de operação

### 8.1 Feature grande

Exemplo:

- nova funcionalidade de custos de oficina com dashboard, importação e alertas.

Fluxo:

1. `planner-produto` define escopo.
2. `database-migrations` cria tabelas e políticas.
3. `backend-edge` cria funções e tools.
4. `frontend-dados` cria hooks e contratos.
5. `frontend-ui` entrega tela.
6. `qa-review` revisa integração.
7. `security-appsec` revisa risco, abuso e controles.

### 8.2 Feature média

Exemplo:

- adicionar análise assistida em módulo existente.

Fluxo:

1. `planner-produto`
2. `backend-edge`
3. `frontend-dados`
4. `frontend-ui`
5. `qa-review`
6. `security-appsec`

### 8.3 Hotfix

Fluxo:

1. agente dono do problema;
2. `qa-review` rápido;
3. deploy.

## 9. Critérios para nova atualização

Antes de começar uma nova funcionalidade, o coordenador deve responder:

- Qual módulo principal será alterado?
- Haverá migration?
- Haverá Edge Function nova ou ajuste nas atuais?
- Haverá impacto em RLS?
- Haverá fluxo de confirmação ou auditoria?
- Há novo vetor de abuso, fraude, spoofing ou engenharia social?
- Quem valida a entrega ponta a ponta?

## 10. Relação com o plano de produto

Este modelo de multiagentes de desenvolvimento complementa o roadmap do runtime de IA em:

- [multiagentes-roadmap.md](/c:/GIT%20GA/Gestao_Ativos/ga_ativos/docs/multiagentes-roadmap.md)

Resumo:

- `multiagentes-roadmap.md` define os agentes do produto.
- este documento define os agentes do processo de desenvolvimento.

## 11. Recomendação prática

Para este projeto, a composição mais útil para próximas entregas é:

1. `planner-produto`
2. `database-migrations`
3. `backend-edge`
4. `frontend-dados`
5. `frontend-ui`
6. `qa-review`
7. `security-appsec`

Essa estrutura prepara bem o terreno para depois adicionar mais skills e automações especializadas.
