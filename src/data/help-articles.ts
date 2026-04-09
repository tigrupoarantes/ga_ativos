export interface HelpArticle {
  id: string;
  module: string;
  moduleLabel: string;
  title: string;
  content: string;
  keywords: string[];
  path?: string;
}

export const helpArticles: HelpArticle[] = [
  // === DASHBOARD ===
  {
    id: "dashboard-overview",
    module: "dashboard",
    moduleLabel: "Dashboard",
    title: "Visão geral do Dashboard",
    content: `O Dashboard é a tela inicial do sistema e apresenta uma visão consolidada de toda a operação.

**O que você encontra aqui:**

- **Cards de estatísticas** — totais de ativos, veículos, funcionários e contratos
- **Alertas automáticos** — o sistema monitora e alerta sobre:
  - CNH vencida ou prestes a vencer
  - Contratos vencidos ou próximos do vencimento
  - Manutenções preventivas atrasadas
  - Peças com estoque abaixo do mínimo

Os alertas são atualizados automaticamente. Clique em um alerta para ir diretamente ao item que precisa de atenção.`,
    keywords: ["dashboard", "início", "alertas", "estatísticas", "indicadores"],
    path: "/",
  },

  // === ATIVOS ===
  {
    id: "ativos-cadastro",
    module: "ativos",
    moduleLabel: "Patrimônio",
    title: "Como cadastrar um ativo",
    content: `Para cadastrar um novo ativo (notebook, celular, equipamento):

1. Acesse **Patrimônio > Ativos**
2. Clique em **"Novo Ativo"**
3. Selecione o **tipo do ativo** (ex: Notebook, Celular)
4. Preencha os campos do formulário (os campos variam conforme o tipo)
5. Opcionalmente, selecione o **funcionário responsável** — a empresa será preenchida automaticamente
6. Clique em **"Criar Ativo"**

O número de patrimônio é gerado automaticamente com base no prefixo do tipo (ex: NB-001 para notebooks).

**Dica:** Se o ativo for atribuído a um funcionário, o status muda automaticamente para "Em uso".`,
    keywords: ["ativo", "patrimônio", "cadastro", "novo", "criar", "notebook", "celular"],
    path: "/ativos",
  },
  {
    id: "ativos-importacao",
    module: "ativos",
    moduleLabel: "Patrimônio",
    title: "Importar ativos via planilha",
    content: `Você pode importar ativos em massa via planilha CSV ou XLSX.

**Importar Celulares:**
1. Clique em **"Importar (CSV/XLSX)"**
2. Selecione o arquivo com as colunas: \`modelo\` e \`imei\` (obrigatórios)
3. O sistema valida os dados e mostra o que será importado
4. Clique em **"Importar"**

**Importar Notebooks:**
1. Clique em **"Importar Notebooks"**
2. Selecione o arquivo com as colunas: \`marca\`, \`modelo\` e \`numero_serie\` (obrigatórios)
3. Opcionalmente inclua a coluna \`cpf\` para associar automaticamente ao funcionário
4. Clique em **"Importar"**

O sistema ignora automaticamente itens duplicados (IMEI ou número de série já existente).`,
    keywords: ["importar", "planilha", "csv", "xlsx", "massa", "celular", "notebook", "imei", "serial"],
    path: "/ativos",
  },
  {
    id: "ativos-comodato",
    module: "ativos",
    moduleLabel: "Patrimônio",
    title: "Gerar contrato de comodato",
    content: `O contrato de comodato formaliza a entrega de um ativo ao funcionário.

**Requisitos:**
- O ativo deve ser do tipo **Celular** ou **Notebook**
- O ativo deve estar com status **"Em uso"** (atribuído a um funcionário)

**Como gerar:**
1. Na tabela de ativos, clique no menu **"..."** do ativo desejado
2. Selecione **"Gerar contrato de comodato"**
3. Confira e complete os dados pessoais do funcionário (RG, cidade, endereço)
4. Clique em **"Gerar Contrato"**

O PDF é gerado automaticamente e baixado. Ele fica armazenado no sistema para download futuro.

**Dica:** Se o funcionário estiver marcado como "Promotor", essa informação aparece automaticamente no contrato.`,
    keywords: ["comodato", "contrato", "pdf", "termo", "responsabilidade", "celular", "notebook"],
    path: "/ativos",
  },
  {
    id: "ativos-busca",
    module: "ativos",
    moduleLabel: "Patrimônio",
    title: "Como buscar ativos",
    content: `A busca de ativos é abrangente e pesquisa em vários campos simultaneamente:

- Nome do ativo
- Número de patrimônio
- Número de série
- Marca e modelo
- IMEI e chip/linha
- Nome, email e CPF do funcionário
- Nome da empresa
- Tipo do ativo

Além da busca por texto, você pode combinar **filtros** por:
- **Status**: Disponível, Em uso, Manutenção, Baixado
- **Tipo**: Notebook, Celular, etc.
- **Empresa**
- **Funcionário**`,
    keywords: ["busca", "pesquisa", "filtro", "encontrar", "imei", "patrimônio", "série"],
    path: "/ativos",
  },

  // === FUNCIONÁRIOS ===
  {
    id: "funcionarios-cadastro",
    module: "funcionarios",
    moduleLabel: "Pessoas",
    title: "Como cadastrar funcionários",
    content: `Para cadastrar um novo funcionário:

1. Acesse **Pessoas > Funcionários**
2. Clique em **"Novo Funcionário"**
3. Preencha os dados básicos (nome, email, telefone, CPF, cargo, departamento)
4. Selecione a **empresa**
5. Marque as flags especiais conforme necessário:
   - **É condutor** — habilita campos de CNH (número, categoria, validade)
   - **É vendedor** — habilita campo de código do vendedor
   - **É promotor** — inclui "Promotor(a)" nos contratos de comodato
6. Preencha os dados adicionais para contratos (RG, cidade, endereço)
7. Clique em **"Criar"**

**Importação em massa:** Use o botão "Importar Funcionários" para cadastrar via planilha CSV/XLSX.`,
    keywords: ["funcionário", "cadastro", "condutor", "motorista", "vendedor", "promotor", "cnh", "importar"],
    path: "/funcionarios",
  },

  // === VEÍCULOS ===
  {
    id: "veiculos-cadastro",
    module: "veiculos",
    moduleLabel: "Frota",
    title: "Como cadastrar veículos",
    content: `Para cadastrar um veículo na frota:

1. Acesse **Frota > Veículos**
2. Clique em **"Novo Veículo"**
3. Preencha os dados: placa, marca, modelo, ano, cor, combustível
4. Informe chassi e RENAVAM
5. Registre quilometragem atual e valor de aquisição
6. Selecione o funcionário responsável e a empresa
7. Salve o cadastro

**Consulta FIPE:** Após cadastrar, use o botão "Consultar FIPE" para obter o valor de mercado do veículo automaticamente.`,
    keywords: ["veículo", "carro", "frota", "placa", "cadastro", "fipe"],
    path: "/veiculos",
  },
  {
    id: "veiculos-multas",
    module: "veiculos",
    moduleLabel: "Frota",
    title: "Registrar multas de trânsito",
    content: `Para registrar uma multa:

1. Acesse **Frota > Veículos > aba Multas**
2. Clique em **"Nova Multa"**
3. Selecione o **veículo** — o motorista responsável é preenchido automaticamente
4. Informe a data e descrição da infração
5. Selecione a **gravidade** — os pontos são calculados automaticamente:
   - Leve: 3 pontos
   - Média: 4 pontos
   - Grave: 5 pontos
   - Gravíssima: 7 pontos
6. Informe valor, local e status
7. Salve a multa

Os pontos podem ser ajustados manualmente se necessário.`,
    keywords: ["multa", "infração", "trânsito", "pontos", "gravidade", "veículo"],
    path: "/veiculos/multas",
  },

  // === OFICINA ===
  {
    id: "oficina-os",
    module: "oficina",
    moduleLabel: "Oficina",
    title: "Ordens de serviço",
    content: `As Ordens de Serviço (OS) controlam os serviços de manutenção realizados.

**Criar uma OS:**
1. Acesse **Frota > Oficina > Ordens de Serviço**
2. Clique em **"Nova OS"**
3. Selecione o veículo e a empresa
4. Adicione os itens de serviço (descrição, peças, valores)
5. A numeração é gerada automaticamente
6. Acompanhe o status: aberta → em andamento → concluída

**Dica:** Ao finalizar uma OS, o sistema pode gerar alertas para a próxima manutenção preventiva.`,
    keywords: ["ordem", "serviço", "os", "manutenção", "oficina", "reparo"],
    path: "/oficina/os",
  },
  {
    id: "oficina-preventivas",
    module: "oficina",
    moduleLabel: "Oficina",
    title: "Manutenção preventiva",
    content: `Configure manutenções preventivas para que o sistema alerte automaticamente quando estiverem próximas.

**Tipos de periodicidade:**
- **Por quilometragem** — ex: troca de óleo a cada 10.000 km
- **Por período** — ex: revisão a cada 6 meses
- **Ambos** — o que vencer primeiro dispara o alerta

**Status:** Pendente → Agendada → Concluída

**Alertas automáticos:** Quando configurado, o sistema envia notificações via WhatsApp para o motorista responsável avisando sobre a manutenção próxima.`,
    keywords: ["preventiva", "manutenção", "agendamento", "alerta", "km", "quilometragem"],
    path: "/oficina/preventivas",
  },
  {
    id: "oficina-pecas",
    module: "oficina",
    moduleLabel: "Oficina",
    title: "Controle de peças e estoque",
    content: `Gerencie o estoque de peças para manutenção:

- **Cadastro:** Código, nome, categoria, fornecedor, preço unitário
- **Estoque:** Quantidade atual e estoque mínimo
- **Movimentações:** Registro de entradas e saídas
- **Alertas:** Quando a quantidade fica abaixo do estoque mínimo, um alerta aparece no Dashboard

**Dica:** Mantenha o estoque mínimo configurado corretamente para não ficar sem peças essenciais.`,
    keywords: ["peça", "estoque", "almoxarifado", "quantidade", "mínimo", "fornecedor"],
    path: "/oficina/pecas",
  },
  {
    id: "oficina-km",
    module: "oficina",
    moduleLabel: "Oficina",
    title: "Coleta de KM via WhatsApp",
    content: `O sistema permite solicitar leituras de quilometragem dos motoristas via WhatsApp.

**Como funciona:**
1. Acesse **Oficina > Coletas de KM**
2. Clique em **"Solicitar KM"** para enviar a mensagem ao motorista
3. O motorista recebe a mensagem no WhatsApp e responde com a foto do hodômetro
4. O sistema extrai automaticamente o valor do hodômetro da foto
5. A leitura é validada automaticamente:
   - **OK** — valor consistente
   - **Suspeito** — valor abaixo do anterior ou muito acima do esperado
   - **Rejeitado** — não foi possível extrair o valor

**Importante:** Para funcionar, o WhatsApp Business precisa estar configurado pelo administrador.`,
    keywords: ["km", "quilometragem", "hodômetro", "whatsapp", "coleta", "motorista", "foto"],
    path: "/oficina/km",
  },

  // === TELEFONIA ===
  {
    id: "telefonia-linhas",
    module: "telefonia",
    moduleLabel: "Telefonia",
    title: "Gerenciar linhas telefônicas",
    content: `Controle as linhas telefônicas da organização.

**Cadastro de linha:**
1. Acesse **Telefonia > Linhas Telefônicas**
2. Clique em **"Nova Linha"**
3. Informe: número, funcionário responsável, operadora e plano
4. Para rateio de custos, preencha: **Empresa**, **Centro de Custo** e **Função**

**Busca:** Pesquise por número da linha ou nome do funcionário.

**Importação:** Importe linhas em massa via planilha CSV/XLSX.

**Sincronização:** Use o botão "Sincronizar com Claro" para importar dados diretamente da operadora.`,
    keywords: ["telefone", "linha", "celular", "operadora", "rateio", "centro de custo"],
    path: "/linhas-telefonicas",
  },
  {
    id: "telefonia-faturas",
    module: "telefonia",
    moduleLabel: "Telefonia",
    title: "Faturas de telefonia",
    content: `Gerencie as faturas das operadoras de telefonia.

**Importar fatura:**
1. Acesse **Telefonia > Faturas**
2. Clique em **"Importar Fatura"**
3. Selecione o arquivo da fatura (PDF ou planilha)
4. O sistema extrai automaticamente os dados por linha

**Detalhamento:** Clique em uma fatura para ver o custo detalhado por linha/funcionário.`,
    keywords: ["fatura", "conta", "telefone", "custo", "operadora", "importar"],
    path: "/telefonia/faturas",
  },

  // === CONTRATOS ===
  {
    id: "contratos-gestao",
    module: "contratos",
    moduleLabel: "Contratos",
    title: "Gerenciar contratos",
    content: `Controle os contratos de serviços e fornecedores.

**Cadastrar contrato:**
1. Acesse **Contratos**
2. Clique em **"Novo Contrato"**
3. Preencha: número, tipo, fornecedor, datas e valores
4. Salve o contrato

**Detalhe do contrato:** Clique em um contrato para acessar:
- **Itens** — produtos/serviços contratados
- **Métricas** — KPIs de desempenho
- **Consumo** — histórico de uso
- **Gráficos** — tendências visuais
- **Chat IA** — faça perguntas sobre o contrato usando inteligência artificial

**Chat IA do contrato:** Você pode enviar uma planilha Excel para o chat e a IA analisa os dados no contexto do contrato.`,
    keywords: ["contrato", "fornecedor", "vencimento", "itens", "métricas", "consumo", "ia"],
    path: "/contratos",
  },

  // === RELATÓRIOS ===
  {
    id: "relatorios-ia",
    module: "relatorios",
    moduleLabel: "Relatórios IA",
    title: "Como usar os relatórios com IA",
    content: `O assistente de IA analisa seus dados e responde perguntas em linguagem natural.

**Como usar:**
1. Acesse **Relatórios IA**
2. Digite sua pergunta na caixa de texto (ex: "Quais veículos têm mais multas?")
3. O assistente analisa os dados do sistema e responde

**Exemplos de perguntas:**
- "Qual o custo total de manutenção no último trimestre?"
- "Quais funcionários têm CNH vencida?"
- "Quantos ativos estão disponíveis por tipo?"
- "Qual o ranking de veículos por custo de manutenção?"
- "Quantas linhas telefônicas estão sem funcionário?"

**Importante:** As respostas são baseadas exclusivamente nos dados cadastrados no sistema.`,
    keywords: ["relatório", "ia", "inteligência artificial", "análise", "pergunta", "insight"],
    path: "/relatorios",
  },

  // === ADMINISTRAÇÃO ===
  {
    id: "admin-usuarios",
    module: "admin",
    moduleLabel: "Administração",
    title: "Gerenciar usuários e aprovações",
    content: `**Aprovar novos usuários:**
1. Acesse **Administração > Usuários**
2. Visualize os cadastros pendentes de aprovação
3. Aprove ou rejeite cada solicitação
4. Defina o perfil de acesso (Assistente, Coordenador, Diretor ou Admin)

**Perfis de acesso:**
- **Assistente** — operação básica do dia a dia
- **Coordenador** — gestão de equipe
- **Diretor** — visão gerencial e relatórios
- **Admin** — acesso total + configurações + permissões`,
    keywords: ["usuário", "aprovação", "perfil", "role", "acesso", "admin"],
    path: "/usuarios",
  },
  {
    id: "admin-permissoes",
    module: "admin",
    moduleLabel: "Administração",
    title: "Configurar permissões por módulo",
    content: `O sistema permite configurar quais módulos cada perfil pode acessar.

**Como configurar:**
1. Acesse **Administração > Permissões**
2. A tela mostra uma matriz de perfis × módulos
3. Para cada combinação, defina:
   - **Pode visualizar** — o módulo aparece no menu
   - **Pode editar** — o usuário pode criar/editar/excluir dados

As permissões são aplicadas em tempo real — ao alterar, o menu do usuário é atualizado na próxima navegação.`,
    keywords: ["permissão", "módulo", "acesso", "visualizar", "editar", "configurar"],
    path: "/permissoes",
  },
  {
    id: "admin-smtp",
    module: "admin",
    moduleLabel: "Administração",
    title: "Configurar email (SMTP)",
    content: `Configure o servidor de email para envio de notificações e recuperação de senha.

**Passo a passo:**
1. Acesse **Administração > Configurações**
2. Na seção **Email/SMTP**, preencha:
   - **Host** — endereço do servidor (ex: smtp.gmail.com)
   - **Porta** — geralmente 587 (STARTTLS) ou 465 (SSL)
   - **Usuário** — email de envio
   - **Senha** — senha do email (para Gmail, use "Senha de App")
   - **Email remetente** e **Nome remetente**
3. Clique em **"Testar"** para validar a configuração
4. Se o teste for bem-sucedido, clique em **"Salvar"**

**Dica para Gmail:** Ative a autenticação em 2 fatores e gere uma "Senha de App" em myaccount.google.com > Segurança > Senhas de app.`,
    keywords: ["email", "smtp", "configuração", "gmail", "senha", "notificação"],
    path: "/configuracoes",
  },

  // === FAQ ===
  {
    id: "faq-senha",
    module: "faq",
    moduleLabel: "Perguntas Frequentes",
    title: "Esqueci minha senha, o que fazer?",
    content: `1. Na tela de login, clique em **"Esqueci minha senha"**
2. Informe o email cadastrado no sistema
3. Verifique sua caixa de entrada (e a pasta de spam)
4. Clique no link recebido para criar uma nova senha

**Importante:** O link de recuperação expira após algumas horas. Se expirar, solicite novamente.`,
    keywords: ["senha", "esqueci", "recuperar", "resetar", "login"],
  },
  {
    id: "faq-aprovacao",
    module: "faq",
    moduleLabel: "Perguntas Frequentes",
    title: "Meu cadastro não foi aprovado ainda",
    content: `Após criar sua conta, um administrador precisa aprovar seu acesso. Isso é uma medida de segurança.

**O que fazer:**
- Entre em contato com o administrador do sistema para solicitar a aprovação
- O administrador acessa **Administração > Usuários** para aprovar seu cadastro
- Após aprovado, você poderá acessar o sistema normalmente`,
    keywords: ["aprovação", "cadastro", "pendente", "acesso", "bloqueado"],
  },
  {
    id: "faq-motorista",
    module: "faq",
    moduleLabel: "Perguntas Frequentes",
    title: "Como funciona o App Motorista?",
    content: `Funcionários marcados como **condutor** que acessam o sistema pelo celular são redirecionados automaticamente para uma interface simplificada.

**O que o motorista pode fazer:**
- Ver informações do veículo vinculado
- Tirar foto do hodômetro para registrar quilometragem
- Confirmar leituras de KM

**No desktop**, o condutor acessa o sistema normalmente com todas as funcionalidades disponíveis para seu perfil.`,
    keywords: ["motorista", "condutor", "celular", "mobile", "app", "km", "hodômetro"],
  },
  {
    id: "faq-bug",
    module: "faq",
    moduleLabel: "Perguntas Frequentes",
    title: "Como reportar um bug ou sugerir melhoria?",
    content: `Você pode reportar problemas ou sugerir melhorias diretamente pelo sistema:

1. Clique no ícone de **inseto** (bug) no canto superior direito da tela
2. Descreva o problema ou sugestão
3. Informe a página onde ocorreu
4. Envie o relato

O administrador pode acompanhar todos os relatos em **Administração > Bugs e Melhorias**.`,
    keywords: ["bug", "erro", "problema", "sugestão", "melhoria", "reportar"],
  },
];
