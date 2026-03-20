# Roadmap de Multiagentes

Este documento propõe uma evolução incremental da camada de IA do app para uma arquitetura de multiagentes, reaproveitando o que já existe hoje no repositório.

## 1. Estado atual

Hoje o sistema já possui blocos especializados de IA, mas ainda não possui orquestração entre agentes:

- `reports-chat`: responde perguntas gerais sobre dados do sistema.
- `contrato-chat`: responde perguntas sobre um contrato específico e analisa planilhas.
- `odometer-ocr`: extrai quilometragem de fotos de hodômetro.
- `workshop-scheduler`: automação determinística para geração de jobs de oficina/WhatsApp.

Na prática, a arquitetura atual é de "funções especializadas isoladas", não de multiagentes.

## 2. Objetivo

Evoluir para uma arquitetura em que:

- exista um ponto único de entrada para IA;
- o sistema escolha qual especialista usar;
- ações sejam executadas por tools reais, não apenas instruções no prompt;
- logs de execução permitam auditoria;
- a UI atual continue funcionando durante a migração.

## 3. Arquitetura alvo

### 3.1 Componentes

- `assistant-hub`
  - Edge Function orquestradora.
  - Recebe a requisição da UI.
  - Decide entre resposta direta, roteamento para especialista, ou execução de tools.

- Agentes especialistas
  - `agent-reports`
  - `agent-contratos`
  - `agent-frota`
  - `agent-oficina`
  - `agent-telefonia`

- Tools internas
  - consultas ao banco por domínio;
  - OCR de hodômetro;
  - leitura/importação de consumo contratual;
  - geração de notificações e jobs;
  - consultas FIPE;
  - sincronizações externas, quando fizer sentido.

- Tabelas de observabilidade
  - `ai_threads`
  - `ai_messages`
  - `ai_runs`
  - `ai_tool_calls`

### 3.2 Fluxo alvo

1. UI envia mensagem para `assistant-hub`.
2. `assistant-hub` identifica intenção e contexto.
3. O orquestrador decide:
   - responder com contexto próprio;
   - chamar um agente especialista;
   - executar uma ou mais tools;
   - pedir confirmação do usuário antes de ação com efeito colateral.
4. O resultado é consolidado e retornado via streaming.
5. Toda execução fica registrada para auditoria.

## 4. Estratégia de migração

### Fase 0. Preparação

Objetivo: corrigir desalinhamentos e preparar o terreno.

Entregas:

- alinhar configuração de IA para usar uma única fonte de verdade;
- revisar a tela de configuração de IA, que hoje não controla de fato as Edge Functions;
- definir contrato comum de mensagens;
- criar padrões de log para execuções de IA.

Critérios de aceite:

- não existir ambiguidade sobre de onde vem a chave/configuração do modelo;
- frontend e backend usarem o mesmo formato de thread/mensagem;
- erros de IA terem logs rastreáveis.

### Fase 1. Orquestrador único

Objetivo: introduzir um ponto único de entrada sem quebrar os chats atuais.

Entregas:

- criar `supabase/functions/assistant-hub`;
- manter `reports-chat` e `contrato-chat`, mas transformá-los em adaptadores ou especialistas chamados pelo hub;
- centralizar autenticação, streaming e tratamento de erro.

Critérios de aceite:

- o hub responder perguntas gerais;
- o hub encaminhar perguntas de contrato corretamente;
- a UI atual continuar operando com mudanças mínimas.

### Fase 2. Tools reais

Objetivo: sair do padrão "tool_call em texto" para execução controlada.

Entregas:

- registrar tools no backend;
- implementar executor de tools com whitelist por domínio;
- converter operações críticas em tools, por exemplo:
  - `get_contract_context`
  - `extract_contract_consumption_from_file`
  - `save_contract_consumption`
  - `get_fleet_summary`
  - `read_odometer_image`
  - `create_notification_job`

Critérios de aceite:

- o modelo não depender de JSON textual para acionar comportamento;
- cada tool registrar entrada, saída, duração e erro;
- ações de escrita exigirem confirmação explícita quando necessário.

### Fase 3. Especialistas por domínio

Objetivo: dividir responsabilidade sem espalhar lógica de forma caótica.

Entregas:

- agente de contratos;
- agente de frota;
- agente de oficina;
- agente de telefonia;
- agente de relatórios executivos.

Regras:

- especialistas não acessam tudo indiscriminadamente;
- cada um recebe apenas contexto relevante;
- o hub continua sendo o único ponto de entrada.

Critérios de aceite:

- redução de prompt/contexto por requisição;
- respostas mais consistentes por domínio;
- menor acoplamento entre módulos.

### Fase 4. Memória e observabilidade

Objetivo: tornar o sistema auditável e operacionalmente confiável.

Entregas:

- persistência de threads;
- histórico por usuário/módulo/entidade;
- dashboards de falha, custo e latência;
- trilha de auditoria de tool calls.

Critérios de aceite:

- ser possível reconstruir uma execução ponta a ponta;
- ser possível medir custo e taxa de erro por agente/tool;
- suporte a troubleshooting sem depender de logs soltos.

### Fase 5. Ações assistidas

Objetivo: permitir que agentes ajudem de verdade a operar o sistema.

Entregas:

- salvar consumo contratual a partir do chat;
- sugerir e criar jobs de notificação;
- abrir pré-cadastros ou rascunhos para revisão humana;
- gerar resumos operacionais agendados.

Critérios de aceite:

- ações sensíveis com confirmação e trilha de auditoria;
- baixa chance de execução incorreta silenciosa;
- UX clara sobre o que foi sugerido versus executado.

## 5. Primeiros agentes recomendados

### 5.1 Agente de contratos

Melhor candidato para ser o primeiro agente real porque:

- já existe chat contextual;
- já existe leitura de Excel;
- já existe uma intenção clara de salvar consumo;
- o escopo é menor e mais controlado que um chat corporativo geral.

Primeiras tools:

- `get_contract_context`
- `extract_contract_spreadsheet`
- `compare_contract_consumption_history`
- `save_contract_consumption`

### 5.2 Agente de frota

Segundo melhor candidato porque:

- já existe OCR especializado;
- já existe bastante dado operacional;
- pode apoiar alertas, custos, manutenção e inconsistências de KM.

Primeiras tools:

- `get_vehicle_context`
- `read_odometer_image`
- `get_fleet_costs_summary`
- `get_preventiva_status`

## 6. Mudanças técnicas recomendadas

### Backend

- criar camada comum para chamadas de modelo;
- criar registry de tools;
- separar montagem de contexto por domínio;
- limitar consultas "mega select" e preferir contexto sob demanda;
- introduzir schemas de entrada/saída para tools.

### Frontend

- padronizar hook de chat para reutilização;
- incluir suporte a confirmação de ações;
- exibir estado de execução de tool quando aplicável;
- preparar a UI para threads persistidas.

### Banco

- criar tabelas para threads, runs e tool calls;
- registrar vínculo com usuário, módulo e entidade de negócio;
- definir retenção de histórico e política de auditoria.

## 7. Riscos principais

- prompt excessivo e caro no `reports-chat`;
- desalinhamento entre configuração visível na UI e execução real no backend;
- executar ações de escrita sem confirmação adequada;
- misturar demais regras de negócio com prompts;
- falta de observabilidade dificultar suporte e confiança.

## 8. Backlog inicial sugerido

Ordem recomendada:

1. Corrigir a governança de configuração da IA.
2. Criar `assistant-hub` com contrato comum de request/response.
3. Extrair helper compartilhado de streaming e chamadas ao modelo.
4. Implementar registry de tools.
5. Converter `contrato-chat` para usar tools reais.
6. Persistir `ai_runs` e `ai_tool_calls`.
7. Migrar a UI de contrato para o hub.
8. Só então começar a dividir em especialistas adicionais.

## 9. Definição de pronto para a primeira entrega

Considerar a primeira fase bem-sucedida quando:

- o usuário puder conversar com um assistente único;
- o fluxo de contrato conseguir ler arquivo, analisar e salvar consumo com confirmação;
- toda execução relevante ficar registrada;
- o chat atual de relatórios continuar funcionando sem regressão.

## 10. Recomendação final

Não começar por um "ecossistema de muitos agentes" ao mesmo tempo.

O melhor caminho para este projeto é:

1. criar um hub único;
2. transformar capacidades existentes em tools;
3. lançar primeiro um agente de contratos;
4. expandir para frota e oficina depois que observabilidade e execução estiverem sólidas.
