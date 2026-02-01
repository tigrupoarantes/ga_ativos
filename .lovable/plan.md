
# Plano: Padronizar Estrutura Organizacional (Empresas + Areas)

## Resumo

Replicar a estrutura do GA360 no Gestao de Ativos, transformando a gestao de "Empresas" e "Equipes" em uma estrutura mais organica com:
- **Empresas (companies)**: com campos visuais (cor, logo) e flag de auditoria
- **Areas**: substituindo "Equipes", com suporte a hierarquia (parent_id) e centro de custo

---

## 1. Alteracoes no Banco de Dados

### 1.1 Tabela `empresas` - Adicionar campos

```text
Campos atuais:     id, nome, razao_social, cnpj, endereco, telefone, email, active
Campos a adicionar: external_id, logo_url, color, is_auditable
Campos a renomear:  endereco -> address, telefone -> phone, active -> is_active
```

**Migracao SQL:**
```sql
-- Adicionar novos campos
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#0B3D91';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS is_auditable BOOLEAN DEFAULT false;

-- Criar indice para external_id (CNPJ normalizado)
CREATE INDEX IF NOT EXISTS idx_empresas_external_id ON empresas(external_id);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_active ON empresas(active);

-- Trigger para atualizar external_id automaticamente
CREATE OR REPLACE FUNCTION normalize_cnpj_to_external_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cnpj IS NOT NULL THEN
    NEW.external_id := regexp_replace(NEW.cnpj, '[^0-9]', '', 'g');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_empresas_normalize_cnpj
  BEFORE INSERT OR UPDATE ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION normalize_cnpj_to_external_id();
```

### 1.2 Tabela `equipes` -> `areas` (renomear e reestruturar)

**Estrategia:** Criar nova tabela `areas` e migrar dados de `equipes`

```sql
-- Criar nova tabela areas
CREATE TABLE areas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID        REFERENCES empresas(id) ON DELETE CASCADE,
  parent_id       UUID        REFERENCES areas(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  cost_center     TEXT,
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX idx_areas_company ON areas(company_id);
CREATE INDEX idx_areas_parent ON areas(parent_id);
CREATE INDEX idx_areas_cost_center ON areas(cost_center);

-- RLS Policies
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados podem ver areas"
  ON areas FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar areas"
  ON areas FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = ANY (ARRAY['admin', 'diretor', 'coordenador'])
      AND user_roles.is_approved = true
    )
  );

-- Migrar dados de equipes para areas
INSERT INTO areas (id, company_id, name, active, created_at, updated_at)
SELECT id, empresa_id, nome, active, created_at, updated_at
FROM equipes;

-- Atualizar funcionarios para usar area_id ao inves de equipe_id
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id);
UPDATE funcionarios SET area_id = equipe_id WHERE equipe_id IS NOT NULL;
```

---

## 2. Arquivos a Criar/Modificar

### 2.1 Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/EstruturaOrganizacional.tsx` | Nova pagina principal com layout de cards |
| `src/components/admin/CompanyCard.tsx` | Card de empresa com areas em TreeView |
| `src/components/admin/CompanyFormDialog.tsx` | Modal criar/editar empresa |
| `src/components/admin/AreaFormDialog.tsx` | Modal criar/editar area |
| `src/components/admin/AreaTreeView.tsx` | Componente arvore hierarquica |
| `src/hooks/useAreas.ts` | Hook CRUD para areas |

### 2.2 Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useEmpresas.ts` | Adicionar campos novos (color, logo_url, is_auditable) |
| `src/pages/Empresas.tsx` | Redirecionar para nova pagina ou deprecar |
| `src/pages/Equipes.tsx` | Deprecar - funcionalidade movida para EstruturaOrganizacional |
| `src/App.tsx` | Adicionar rota `/estrutura-organizacional` |
| `src/components/AppLayout.tsx` | Atualizar menu lateral |
| `src/types/index.ts` | Adicionar tipos Empresa e Area atualizados |

---

## 3. Layout da Nova Pagina

### 3.1 Estrutura Visual

```text
+---------------------------------------------------------------+
| <- Voltar                                                      |
+---------------------------------------------------------------+
|                                                                |
|  Estrutura Organizacional                    [+ Nova Empresa]  |
|  Gerencie empresas e areas do Grupo                            |
|                                                                |
+---------------------------------------------------------------+
|                                                                |
|  +------------------+  +------------------+  +----------------+ |
|  | [cor]  [ed][del] |  | [cor]  [ed][del] |  | [cor] [ed][del]| |
|  |                  |  |                  |  |                | |
|  | JArantes         |  | Chok Distrib.    |  | G4 Arantes     | |
|  | CNPJ: 12.513...  |  | CNPJ: 05.383...  |  | CNPJ: 42.501...| |
|  |                  |  |                  |  |                | |
|  | Areas [+ Nova]   |  | Areas [+ Nova]   |  | Areas [+ Nova] | |
|  | +-------------+  |  | +-------------+  |  | +------------+ | |
|  | | > COMERCIAL |  |  | |   VENDAS AS |  |  | |  COMERCIAL | | |
|  | |   - Sul     |  |  | |   VENDAS KA |  |  | |  LOGISTICA | | |
|  | |   - Norte   |  |  | |   MERCH     |  |  | +------------+ | |
|  | | > LOGISTICA |  |  | +-------------+  |  |                | |
|  | +-------------+  |  |                  |  |                | |
|  +------------------+  +------------------+  +----------------+ |
|                                                                |
+---------------------------------------------------------------+
```

### 3.2 Componentes React

**CompanyCard:**
- Exibe icone com cor tematica da empresa
- Mostra nome, CNPJ formatado
- Botoes editar/excluir (aparecem no hover)
- Secao "Areas" com TreeView e botao "+ Nova Area"

**AreaTreeView:**
- Renderiza hierarquia recursiva
- Icones de expandir/colapsar para areas com filhos
- Centro de custo exibido entre parenteses
- Botoes editar/excluir por area

---

## 4. Tipos TypeScript

```typescript
// src/types/organization.ts

export interface Empresa {
  id: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  external_id?: string;        // CNPJ sem formatacao (sync key)
  endereco?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  color?: string;              // Cor hex (#0B3D91)
  is_auditable?: boolean;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Area {
  id: string;
  company_id?: string;
  parent_id?: string;          // Hierarquia
  name: string;
  cost_center?: string;        // Centro de custo
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos calculados
  children?: Area[];           // Sub-areas
  company?: Empresa;
}
```

---

## 5. Hook useAreas

```typescript
// src/hooks/useAreas.ts

export function useAreas(companyId?: string) {
  // Query com filtro por empresa
  const { data: areas } = useQuery({
    queryKey: ["areas", companyId],
    queryFn: async () => {
      let query = supabase
        .from("areas")
        .select("*")
        .eq("active", true)
        .order("name");
      
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return buildAreaTree(data);  // Monta hierarquia
    },
  });

  // Mutations: create, update, delete
  // ...
}

// Funcao para montar arvore hierarquica
function buildAreaTree(areas: Area[]): Area[] {
  const map = new Map<string, Area>();
  const roots: Area[] = [];

  // Criar mapa de todos os nos
  areas.forEach(area => {
    map.set(area.id, { ...area, children: [] });
  });

  // Montar hierarquia
  areas.forEach(area => {
    const node = map.get(area.id)!;
    if (area.parent_id && map.has(area.parent_id)) {
      map.get(area.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
```

---

## 6. Formularios

### 6.1 CompanyFormDialog

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| Nome | Text | Sim | min 1 char |
| Razao Social | Text | Nao | - |
| CNPJ | Text (masked) | Nao | formato valido |
| Endereco | Text | Nao | - |
| Telefone | Text | Nao | - |
| Email | Email | Nao | formato valido |
| Cor Tematica | Color picker | Nao | hex valido |
| URL Logo | URL | Nao | URL valida |
| Ativa | Switch | Sim | boolean |
| Auditavel | Switch | Nao | boolean |

### 6.2 AreaFormDialog

| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| Nome | Text | Sim | min 2 chars |
| Centro de Custo | Text | Nao | - |
| Area Superior | Select | Nao | Exclui propria area e descendentes |

---

## 7. Sequencia de Implementacao

### Fase 1: Banco de Dados
1. Executar migracao para adicionar campos em `empresas`
2. Criar tabela `areas` com RLS
3. Migrar dados de `equipes` para `areas`
4. Adicionar `area_id` em `funcionarios`

### Fase 2: Backend (Hooks)
5. Atualizar `useEmpresas` com novos campos
6. Criar `useAreas` com suporte a hierarquia
7. Atualizar `useFuncionarios` para usar `area_id`

### Fase 3: Componentes
8. Criar `AreaTreeView` (arvore hierarquica)
9. Criar `CompanyFormDialog` (modal empresa)
10. Criar `AreaFormDialog` (modal area)
11. Criar `CompanyCard` (card com areas)

### Fase 4: Pagina Principal
12. Criar `EstruturaOrganizacional.tsx`
13. Atualizar rotas em `App.tsx`
14. Atualizar menu em `AppLayout.tsx`

### Fase 5: Limpeza
15. Deprecar pagina `Empresas.tsx`
16. Deprecar pagina `Equipes.tsx`
17. Remover referencias antigas

---

## 8. Compatibilidade com GA360

Apos esta implementacao, a sincronizacao sera facilitada:

| Gestao de Ativos | GA360 | Tipo |
|------------------|-------|------|
| empresas.external_id | companies.external_id | Chave sync |
| empresas.nome | companies.name | Mapeamento direto |
| empresas.color | companies.color | Mapeamento direto |
| areas.id | areas.external_id | Chave sync (a adicionar no GA360) |
| areas.name | areas.name | Mapeamento direto |
| areas.cost_center | areas.cost_center | Mapeamento direto |
| areas.parent_id | areas.parent_id | Hierarquia preservada |

---

## 9. Consideracoes Importantes

- **Migracao de dados:** Os dados existentes em `equipes` serao migrados para `areas`
- **Funcionarios:** O campo `equipe_id` sera substituido por `area_id`
- **Retrocompatibilidade:** Durante a transicao, manter ambos os campos
- **Trigger CNPJ:** Automatiza a geracao do `external_id` a partir do CNPJ

