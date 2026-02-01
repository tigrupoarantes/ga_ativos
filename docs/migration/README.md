# Guia de Migração: Lovable Cloud → Supabase Próprio

Este guia detalha o processo completo para migrar seu aplicativo do Lovable Cloud para seu próprio projeto Supabase.

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com)
- Supabase CLI instalado (opcional, mas recomendado)
- Acesso ao Cloud Dashboard atual para exportar dados

## 🚀 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Preencha:
   - **Organization**: Selecione ou crie uma organização
   - **Project name**: Nome do seu projeto
   - **Database Password**: Crie uma senha forte (guarde-a!)
   - **Region**: Escolha a região mais próxima (ex: São Paulo)
4. Aguarde a criação do projeto (~2 minutos)
5. Anote as credenciais em **Settings > API**:
   - `Project URL`: https://[project-id].supabase.co
   - `anon public key`: Chave pública para frontend
   - `service_role key`: Chave privada para edge functions

### 2. Executar Schema SQL

1. No Supabase Dashboard, vá em **SQL Editor**
2. Crie uma nova query
3. Cole o conteúdo do arquivo `schema-completo.sql`
4. Execute o script (pode levar alguns segundos)
5. Verifique se todas as tabelas foram criadas em **Table Editor**

### 3. Exportar e Importar Dados

#### Exportar do Lovable Cloud:
1. Acesse o Cloud Dashboard
2. Vá em **Database > Export**
3. Exporte cada tabela como CSV

#### Importar no Supabase:
1. No Supabase, vá em **Table Editor**
2. Selecione a tabela
3. Use **Import data from CSV**
4. Repita para cada tabela

**Ordem recomendada de importação:**
1. `empresas`
2. `asset_types`
3. `tipos_veiculos`
4. `equipes`
5. `funcionarios`
6. `veiculos`
7. `assets`
8. (demais tabelas)

### 4. Configurar Storage

1. No Supabase, vá em **Storage**
2. O bucket `veiculos-documentos` já foi criado pelo script
3. Verifique se as policies estão ativas

Para migrar arquivos existentes:
1. Baixe os arquivos do Cloud atual
2. Faça upload via Dashboard ou API

### 5. Deploy das Edge Functions

#### Opção A: Via Supabase CLI (Recomendado)

```bash
# Instalar CLI (se necessário)
npm install -g supabase

# Inicializar projeto local
supabase init

# Linkar ao projeto
supabase link --project-ref [seu-project-id]

# Deploy das funções
supabase functions deploy consulta-fipe
supabase functions deploy send-email
supabase functions deploy test-smtp
supabase functions deploy password-reset-request
supabase functions deploy password-reset-confirm
supabase functions deploy reports-chat
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-webhook
supabase functions deploy workshop-scheduler
```

#### Opção B: Via Dashboard

1. Vá em **Edge Functions** no dashboard
2. Clique em **Create a new function**
3. Cole o código de cada arquivo em `supabase/functions/`

### 6. Configurar Secrets

No Supabase Dashboard, vá em **Settings > Edge Functions > Secrets**:

| Secret | Valor |
|--------|-------|
| `SUPABASE_URL` | URL do seu projeto |
| `SUPABASE_ANON_KEY` | Chave anon pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role |

**Secrets adicionais (se usar WhatsApp):**
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_API_KEY`

**Secrets adicionais (se usar AI/reports-chat):**
- `LOVABLE_API_KEY` (ou chave da API de IA que usar)

### 7. Atualizar Frontend

Crie/atualize o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_PROJECT_ID="seu-project-id-aqui"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key-aqui"
VITE_SUPABASE_URL="https://seu-project-id.supabase.co"
```

**Importante**: O arquivo `src/integrations/supabase/client.ts` já lê essas variáveis automaticamente.

### 8. Configurar Autenticação

1. Vá em **Authentication > URL Configuration**
2. Configure:
   - **Site URL**: URL de produção (ex: `https://seuapp.com`)
   - **Redirect URLs**: Adicione URLs permitidas:
     - `http://localhost:5173` (desenvolvimento)
     - `https://seuapp.com` (produção)
     - URLs de preview se usar

### 9. Testar a Migração

Execute os testes na seguinte ordem:

- [ ] Login/Signup funcionando
- [ ] Dashboard carrega estatísticas
- [ ] CRUD de veículos
- [ ] CRUD de ativos
- [ ] CRUD de funcionários
- [ ] Upload de documentos
- [ ] Ordens de serviço
- [ ] Envio de emails (se configurado)
- [ ] Consulta FIPE (edge function)

## ⚠️ Considerações Importantes

### Usuários
Os usuários do `auth.users` **não podem ser exportados diretamente**. Opções:
- Usuários se recadastram no novo sistema
- Use a [Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser) para migrar

### UUIDs
Os IDs (UUIDs) são mantidos durante a exportação/importação, garantindo integridade referencial.

### Edge Functions
Algumas funções dependem de secrets específicos. Certifique-se de configurá-los antes de testar.

### Realtime
Se usar Realtime, reconfigure as publicações:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.sua_tabela;
```

## 📁 Arquivos de Referência

- `schema-completo.sql` - Script SQL com todo o schema
- `edge-functions/` - Código das edge functions (já no projeto em `supabase/functions/`)

## 🆘 Troubleshooting

### Erro de RLS
Se receber erros de permissão, verifique se o usuário está autenticado e tem a role correta em `user_roles`.

### Trigger não dispara
Verifique se os triggers foram criados corretamente executando:
```sql
SELECT * FROM pg_trigger;
```

### Edge Function não funciona
Verifique os logs em **Edge Functions > Logs** e certifique-se de que os secrets estão configurados.

---

## ✅ Checklist Final

- [ ] Projeto Supabase criado
- [ ] Schema executado com sucesso
- [ ] Dados importados
- [ ] Storage configurado
- [ ] Edge functions deployadas
- [ ] Secrets configurados
- [ ] `.env` atualizado
- [ ] Autenticação configurada
- [ ] Testes realizados
- [ ] Aplicação funcionando

---

**Data de geração**: 2026-02-01
**Versão do schema**: 1.0
