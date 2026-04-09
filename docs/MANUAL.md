# Manual Funcional — Gestão de Ativos

## 1. Visão Geral

O **Gestão de Ativos** é um sistema web para controle completo do patrimônio corporativo. Permite gerenciar ativos de TI (notebooks, celulares), frota de veículos, oficina e manutenção, contratos, telefonia e pessoas — tudo em uma única plataforma.

### Para quem é

- **Assistentes administrativos** — cadastro e consulta do dia a dia
- **Coordenadores** — gestão de equipes e aprovações
- **Diretores** — visão gerencial e relatórios
- **Administradores** — configuração do sistema e permissões

---

## 2. Primeiros Passos

### 2.1 Acesso ao sistema

1. Acesse o endereço do sistema no navegador
2. Na tela de login, informe seu **email** e **senha**
3. Se não possui conta, clique em **Criar conta** e preencha os dados

### 2.2 Aprovação de cadastro

Novos usuários precisam ser **aprovados por um administrador** antes de acessar o sistema. Após o cadastro, aguarde a aprovação.

### 2.3 Recuperação de senha

1. Na tela de login, clique em **Esqueci minha senha**
2. Informe seu email cadastrado
3. Você receberá um link para redefinir a senha

---

## 3. Dashboard

A tela inicial apresenta uma visão geral do sistema com:

- **Cards de estatísticas** — totais de ativos, veículos, funcionários, contratos
- **Alertas automáticos**:
  - CNH vencida ou prestes a vencer (condutores)
  - Contratos vencidos ou próximos do vencimento
  - Manutenções preventivas atrasadas
  - Peças com estoque abaixo do mínimo

---

## 4. Patrimônio (Ativos)

### 4.1 Ativos

**Caminho:** Menu lateral > Patrimônio > Ativos

Gerencie todos os ativos patrimoniais da organização (notebooks, celulares, equipamentos, etc.).

#### Funcionalidades

- **Cadastro**: Clique em "Novo Ativo", selecione o tipo e preencha os campos do formulário dinâmico
- **Busca**: Use a barra de pesquisa para encontrar por nome, patrimônio, número de série, marca, modelo, IMEI, chip, funcionário ou empresa
- **Filtros**: Filtre por status (disponível, em uso, manutenção, baixado), tipo, empresa e funcionário
- **Edição**: Clique no ícone de lápis para editar qualquer campo do ativo
- **Exclusão**: Clique no ícone de lixeira (exclusão lógica — o ativo é desativado, não apagado)
- **Devolução**: No menu "..." do ativo, clique em "Devolver ativo" para desassociar do funcionário
- **Histórico**: No menu "...", veja o histórico completo de movimentações

#### Importação em massa

- **Celulares**: Botão "Importar (CSV/XLSX)" — campos obrigatórios: `modelo` e `imei`
- **Notebooks**: Botão "Importar Notebooks" — campos obrigatórios: `marca`, `modelo` e `numero_serie`; campo opcional: `cpf` (para associar automaticamente ao funcionário)

#### Contrato de comodato

Para ativos do tipo celular ou notebook que estejam **em uso** (atribuídos a um funcionário):
1. No menu "..." do ativo, clique em "Gerar contrato de comodato"
2. Preencha ou confirme os dados pessoais (RG, cidade, endereço)
3. Clique em "Gerar Contrato" — o PDF é gerado e baixado automaticamente
4. O contrato fica armazenado e pode ser baixado novamente a qualquer momento

#### Atribuição automática de empresa

Ao selecionar um funcionário responsável pelo ativo, a empresa é preenchida automaticamente com base na empresa do funcionário.

### 4.2 Tipos de Ativos

**Caminho:** Menu lateral > Patrimônio > Tipos de Ativos

Configure os tipos de ativos disponíveis no sistema:
- Nome e categoria do tipo
- Prefixo para geração automática de patrimônio (ex: "NB-" para notebooks)
- Taxa de depreciação e vida útil em meses
- Campos personalizados do formulário (quais campos aparecem, quais são obrigatórios)

---

## 5. Pessoas

### 5.1 Funcionários

**Caminho:** Menu lateral > Pessoas > Funcionários

Cadastre e gerencie os funcionários da organização.

#### Campos principais

- Nome, email, telefone, CPF
- Cargo e departamento
- Empresa vinculada
- RG, cidade e endereço (usados nos contratos de comodato)

#### Flags especiais

- **É condutor**: Marca o funcionário como motorista. Habilita campos de CNH (número, categoria, validade). Condutores em dispositivos móveis são redirecionados para o App Motorista.
- **É vendedor**: Habilita o campo "Código do Vendedor"
- **É promotor**: Quando marcado, o cargo "Promotor(a)" aparece automaticamente nos contratos de comodato

#### Importação em massa

Botão "Importar Funcionários" aceita planilha CSV/XLSX com os dados dos funcionários.

### 5.2 Empresas

**Caminho:** Menu lateral > Administração > Configurações (seção Empresas)

Cadastre as empresas do grupo com nome, razão social e CNPJ.

### 5.3 Equipes

Organize funcionários em equipes com líder designado.

---

## 6. Frota (Veículos)

### 6.1 Veículos

**Caminho:** Menu lateral > Frota > Veículos

Cadastre e gerencie a frota de veículos.

#### Campos principais

- Placa, marca, modelo, ano de fabricação/modelo
- Cor, combustível, tipo de veículo
- Chassi, RENAVAM
- Quilometragem atual, valor de aquisição
- Funcionário responsável e empresa

#### Consulta FIPE

Consulte o valor de mercado do veículo pela tabela FIPE:
1. Na tela do veículo, clique em "Consultar FIPE"
2. Selecione marca, modelo e ano
3. O valor FIPE é preenchido automaticamente

#### Consulta FIPE em massa

Para atualizar o valor FIPE de vários veículos de uma vez, use a "Consulta FIPE em Massa" disponível na tela de veículos.

### 6.2 Multas

**Caminho:** Menu lateral > Frota > Veículos > aba Multas

Registre infrações de trânsito dos veículos da frota.

#### Funcionalidades

- **Gravidade automática**: Selecione a gravidade (Leve, Média, Grave, Gravíssima) e os pontos são preenchidos automaticamente (3, 4, 5 ou 7 pontos)
- **Motorista automático**: Ao selecionar o veículo, o motorista responsável é preenchido automaticamente
- **Status**: Pendente, Pago, Recorrido ou Cancelado
- **Campos**: Data, descrição, código da infração, local, valor, comprovante

### 6.3 Histórico de Responsável

Visualize o histórico de quem dirigiu cada veículo e em qual período.

### 6.4 Custos de Veículos

Dashboard com análise de custos da frota: manutenção, combustível, seguros e tendências.

---

## 7. Oficina / Manutenção

**Caminho:** Menu lateral > Frota > Oficina

Módulo completo para gestão de manutenção da frota.

### 7.1 Dashboard da Oficina

Visão geral com indicadores de ordens de serviço, preventivas pendentes e alertas.

### 7.2 Ordens de Serviço (OS)

Crie e gerencie ordens de serviço para manutenção:
- Numeração automática sequencial
- Vinculação ao veículo e empresa
- Itens de serviço com descrição e valores
- Fluxo de status (aberta → em andamento → concluída)

### 7.3 Peças e Estoque

Controle o estoque de peças de manutenção:
- Cadastro com código, categoria, fornecedor
- Controle de quantidade em estoque e estoque mínimo
- Preço unitário e movimentações de entrada/saída
- Alerta automático quando estoque fica abaixo do mínimo

### 7.4 Manutenção Preventiva

Configure manutenções preventivas recorrentes:
- Por quilometragem (ex: troca de óleo a cada 10.000 km)
- Por período (ex: revisão a cada 6 meses)
- Status: pendente, agendada, concluída
- Alertas automáticos via WhatsApp quando a preventiva está próxima

### 7.5 Lavagens

Gerencie planos e registros de lavagem dos veículos.

### 7.6 Agenda

Calendário de agendamentos para serviços de oficina. Lembretes enviados automaticamente via WhatsApp (D-1).

### 7.7 Coletas de KM

Controle as leituras de hodômetro dos veículos:
- Solicite leituras de KM via WhatsApp para os motoristas
- Os motoristas respondem com a foto do hodômetro
- O sistema extrai o valor automaticamente e valida (ok, suspeito, rejeitado)

### 7.8 Notificações

Visualize e gerencie as notificações enviadas e pendentes (WhatsApp e email).

---

## 8. Telefonia

### 8.1 Linhas Telefônicas

**Caminho:** Menu lateral > Telefonia > Linhas Telefônicas

Gerencie as linhas telefônicas da organização.

#### Campos

- Número da linha
- Funcionário responsável
- Operadora (Vivo, Claro, TIM, Oi, Outras)
- Plano
- **Rateio**: Empresa, Centro de Custo e Função — para controle de custos e distribuição

#### Funcionalidades

- **Busca**: Pesquise por número da linha ou nome do funcionário
- **Filtro por operadora**
- **Importação em massa**: Importe linhas via planilha CSV/XLSX
- **Sincronização com Claro**: Sincronize dados diretamente da operadora

### 8.2 Faturas de Telefonia

**Caminho:** Menu lateral > Telefonia > Faturas

Gerencie as faturas das operadoras de telefonia:
- Upload de faturas (importação de PDF/planilha)
- Detalhamento por linha (custo por funcionário)
- Custo compartilhado e quantidade de linhas

---

## 9. Contratos

**Caminho:** Menu lateral > Contratos

Gerencie contratos de serviços e fornecedores.

### 9.1 Cadastro

- Número, tipo, fornecedor
- Datas de início e fim
- Valor mensal e valor total
- Status: ativo, vencido, cancelado, renovação
- Arquivos e observações

### 9.2 Detalhe do Contrato

Ao clicar em um contrato, acesse:

- **Itens**: Produtos/serviços do contrato
- **Métricas/KPIs**: Indicadores de desempenho configuráveis
- **Consumo**: Registro de uso/consumo ao longo do tempo
- **Gráficos**: Visualização de tendências
- **Chat IA**: Converse com a inteligência artificial sobre o contrato. Você pode enviar uma planilha Excel para análise contextualizada.

---

## 10. Relatórios com IA

**Caminho:** Menu lateral > Relatórios IA

Converse com o assistente de inteligência artificial para obter análises e insights sobre seus dados:

- Faça perguntas em linguagem natural (ex: "Quais veículos têm mais multas?", "Qual o custo total de manutenção no último trimestre?")
- O assistente acessa os dados do sistema em tempo real
- Respostas são geradas com base exclusivamente nos seus dados

---

## 11. Histórico

**Caminho:** Menu lateral > Histórico

Visualize o registro completo de todas as ações realizadas no sistema:
- Quem fez a alteração
- O que foi alterado (dados anteriores e novos)
- Data e hora
- Tipo de ação (criação, edição, exclusão)

---

## 12. Administração

Acessível apenas para usuários com perfil **Admin**.

### 12.1 Usuários

**Caminho:** Menu lateral > Administração > Usuários

- Visualize todos os usuários cadastrados
- Aprove ou rejeite novos cadastros
- Altere o perfil de acesso (role) dos usuários

### 12.2 Permissões

**Caminho:** Menu lateral > Administração > Permissões

Configure quais módulos cada perfil pode acessar:
- Matriz de permissões: perfil × módulo
- Permissões de visualização e edição independentes

### 12.3 Configurações

**Caminho:** Menu lateral > Administração > Configurações

#### Email (SMTP)

Configure o servidor de email para envio de notificações e recuperação de senha:
1. Preencha os dados do servidor (host, porta, usuário, senha)
2. Clique em "Testar" para validar a configuração
3. Salve as configurações

#### Empresas e Áreas

Gerencie as empresas do grupo e a estrutura organizacional (áreas com centros de custo).

### 12.4 Bugs e Melhorias

**Caminho:** Menu lateral > Administração > Bugs e Melhorias

Visualize os relatos de bugs e sugestões de melhoria enviados pelos usuários do sistema.

---

## 13. App Motorista

Motoristas (funcionários marcados como **condutor**) que acessam o sistema pelo celular são automaticamente redirecionados para uma interface simplificada:

- **Tela inicial** com informações do veículo vinculado
- **Captura de hodômetro** — tire uma foto do painel para registrar a quilometragem
- **Confirmação** — revise e confirme a leitura de KM

---

## 14. Perfis de Acesso

| Perfil | Descrição | Acesso |
|--------|-----------|--------|
| **Assistente** | Operação básica do dia a dia | Módulos liberados pelo admin |
| **Coordenador** | Gestão de equipe | Módulos liberados + visão de equipe |
| **Diretor** | Visão gerencial | Módulos liberados + relatórios |
| **Admin** | Acesso total | Todos os módulos + configurações + permissões + usuários |

A matriz de permissões é configurável: o administrador define quais módulos cada perfil pode ver e editar.

---

## 15. Integrações

### WhatsApp

O sistema pode enviar mensagens automáticas via WhatsApp:
- Solicitações de coleta de KM para motoristas
- Alertas de manutenção preventiva
- Lembretes de agenda de oficina
- Lembretes de lavagem

Os motoristas podem responder pelo WhatsApp com a foto do hodômetro.

### Consulta FIPE

Integração com a tabela FIPE para consulta de valores de mercado de veículos.

### Sincronização com sistemas externos

- **GA360** — sincronização de empresas e funcionários
- **GA Pagamentos** — sincronização com sistema de pagamentos

---

## 16. Dicas e Boas Práticas

1. **Sempre associe ativos a funcionários** — isso mantém o controle de responsabilidade e permite gerar contratos de comodato
2. **Mantenha o estoque de peças atualizado** — os alertas de estoque mínimo dependem disso
3. **Configure as preventivas** — o sistema alerta automaticamente quando estão próximas
4. **Use os relatórios IA** — faça perguntas em linguagem natural para obter insights rapidamente
5. **Solicite KM regularmente** — a coleta via WhatsApp facilita o controle da frota
6. **Mantenha os dados de CNH atualizados** — o dashboard alerta sobre CNHs vencidas
