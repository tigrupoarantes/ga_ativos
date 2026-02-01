

# Plano de Migração: Lovable Cloud para Supabase Proprio

## Visao Geral

Este plano detalha os passos necessarios para migrar seu aplicativo do Lovable Cloud para seu proprio projeto Supabase. A migracao envolve exportar schema, dados, edge functions e reconfigurar o frontend.

## Inventario do Projeto Atual

### Tabelas do Banco de Dados (28 tabelas)

| Tabela | Descricao |
|--------|-----------|
| activity_history | Historico de atividades |
| allowed_email_domains | Dominios de email permitidos |
| asset_types | Tipos de ativos |
| assets | Ativos/patrimonio |
| atribuicoes | Atribuicoes de ativos a funcionarios |
| audit_log | Log de auditoria |
| contratos | Contratos |
| empresas | Empresas |
| equipes | Equipes |
| funcionarios | Funcionarios |
| itens_ordem | Itens de ordem de servico |
| linhas_telefonicas | Linhas telefonicas |
| module_permissions | Permissoes de modulos |
| movimentacoes_estoque | Movimentacoes de estoque |
| notification_jobs | Jobs de notificacao |
| notifications | Notificacoes |
| ordens_servico | Ordens de servico |
| password_reset_tokens | Tokens de reset de senha |
| pecas | Pecas |
| preventivas | Manutencoes preventivas |
| service_appointments | Agendamentos de servico |
| smtp_config | Configuracao SMTP |
| tipos_veiculos | Tipos de veiculos |
| user_roles | Roles de usuario |
| vehicle_odometer_reports | Relatorios de odometro |
| veiculos | Veiculos |
| veiculos_documentos | Documentos de veiculos |
| veiculos_historico_responsavel | Historico de responsaveis |
| veiculos_multas | Multas de veiculos |
| veiculos_seguros | Seguros de veiculos |
| wash_plans | Planos de lavagem |

### Edge Functions (9 funcoes)

1. **consulta-fipe** - Consulta tabela FIPE
2. **password-reset-confirm** - Confirmacao de reset de senha
3. **password-reset-request** - Solicitacao de reset de senha
4. **reports-chat** - Chat de relatorios (IA)
5. **send-email** - Envio de emails via SMTP
6. **test-smtp** - Teste de configuracao SMTP
7. **whatsapp-send** - Envio de mensagens WhatsApp
8. **whatsapp-webhook** - Webhook do WhatsApp
9. **workshop-scheduler** - Agendador de oficina

### Database Functions (10 funcoes)

1. `update_vehicle_km_on_report()` - Trigger para atualizar KM
2. `create_asset_with_patrimonio()` - Criar ativo com patrimonio
3. `generate_patrimonio()` - Gerar numero de patrimonio
4. `log_asset_assignment_change()` - Log de mudanca de atribuicao
5. `handle_new_user()` - Handler para novo usuario
6. `update_updated_at_column()` - Atualizar coluna updated_at
7. `generate_os_number()` - Gerar numero de OS
8. `is_current_user_admin()` - Verificar se usuario e admin
9. `get_current_user_role()` - Obter role do usuario atual
10. `get_dashboard_stats()` - Estatisticas do dashboard
11. `get_dashboard_alerts()` - Alertas do dashboard

### Storage Buckets

1. **veiculos-documentos** (publico) - Documentos de veiculos

---

## Etapas da Migracao

### Etapa 1: Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Anote as credenciais:
   - **Project URL**: `https://[project-id].supabase.co`
   - **Anon Key**: chave publica para o frontend
   - **Service Role Key**: chave privada para edge functions

### Etapa 2: Exportar e Executar Schema

Vou gerar um arquivo SQL consolidado com todo o schema. Voce deve executar este SQL no SQL Editor do seu novo projeto Supabase.

O arquivo incluira:
- Criacao de todas as tabelas
- Constraints e foreign keys
- RLS policies
- Database functions
- Triggers
- Dados iniciais (module_permissions)

### Etapa 3: Exportar Dados

Para exportar os dados do Lovable Cloud:

1. Acesse o Cloud Dashboard
2. Va em **Database > Export**
3. Exporte cada tabela como CSV ou JSON
4. Importe no novo Supabase via SQL Editor ou interface

### Etapa 4: Configurar Storage

No novo projeto Supabase:

1. Va em **Storage**
2. Crie bucket `veiculos-documentos` como publico
3. Configure as policies de acesso

### Etapa 5: Migrar Edge Functions

Copie as edge functions para o novo projeto. Existem duas opcoes:

**Opcao A - Via Supabase CLI:**
```bash
supabase init
supabase link --project-ref [seu-project-id]
supabase functions deploy consulta-fipe
supabase functions deploy send-email
# ... repetir para cada funcao
```

**Opcao B - Via Dashboard:**
1. Va em **Edge Functions** no dashboard
2. Crie cada funcao manualmente
3. Cole o codigo de cada arquivo

### Etapa 6: Configurar Secrets

No novo Supabase, configure os secrets necessarios:

| Secret | Descricao |
|--------|-----------|
| SUPABASE_URL | URL do projeto |
| SUPABASE_ANON_KEY | Chave anonima |
| SUPABASE_SERVICE_ROLE_KEY | Chave de servico |

### Etapa 7: Atualizar Configuracao do Frontend

Atualizar o arquivo `.env` com as novas credenciais:

```env
VITE_SUPABASE_PROJECT_ID="[novo-project-id]"
VITE_SUPABASE_PUBLISHABLE_KEY="[nova-anon-key]"
VITE_SUPABASE_URL="https://[novo-project-id].supabase.co"
```

### Etapa 8: Configurar Autenticacao

No novo Supabase:

1. Va em **Authentication > URL Configuration**
2. Configure Site URL: `https://seu-dominio.com`
3. Configure Redirect URLs: adicione URLs do preview e producao

---

## Script SQL Consolidado

Disponibilizarei um script SQL completo que consolida todas as 25 migracoes existentes. Este script deve ser executado no SQL Editor do novo Supabase.

O script incluira:
1. Criacao de sequencias (os_sequence)
2. Todas as tabelas com suas colunas e tipos
3. Foreign keys
4. RLS habilitado em todas as tabelas
5. Policies de acesso
6. Functions e triggers
7. Dados iniciais de permissoes

---

## Checklist Pos-Migracao

- [ ] Schema criado com sucesso
- [ ] Dados importados
- [ ] Storage bucket criado
- [ ] Edge functions deployadas
- [ ] Secrets configurados
- [ ] .env atualizado no frontend
- [ ] Autenticacao funcionando
- [ ] Testar login/signup
- [ ] Testar CRUD em cada modulo
- [ ] Testar upload de documentos
- [ ] Testar edge functions

---

## Consideracoes Importantes

1. **Dados de Usuarios**: Os usuarios do auth.users nao podem ser exportados diretamente. Usuarios precisarao se recadastrar ou voce pode usar a API Admin do Supabase para migrar.

2. **IDs e Referencias**: Se voce exportar/importar dados, os UUIDs serao mantidos, garantindo integridade referencial.

3. **Edge Functions**: Algumas funcoes dependem de secrets (ex: WhatsApp API key). Configure-os no novo projeto.

4. **Realtime**: Se estiver usando realtime, reconfigure as publicacoes apos a migracao.

---

## Proximo Passo

Apos sua aprovacao, irei:
1. Gerar o script SQL consolidado completo
2. Criar um arquivo de documentacao da migracao no projeto
3. Atualizar o `.env` com placeholders para as novas credenciais

