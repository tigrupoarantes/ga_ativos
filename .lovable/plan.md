

# Plano: Reformulação do Cadastro de Ativos com Formulários Específicos por Tipo

## Resumo

Vamos reformular o fluxo de cadastro de ativos para:
1. **Primeiro passo**: Usuário seleciona o tipo de ativo em um dropdown
2. **Segundo passo**: Sistema exibe formulário específico baseado no tipo selecionado
3. **Tipos de Ativos**: Ao cadastrar/editar um tipo, haverá botão para personalizar quais campos aparecem no formulário

---

## Arquitetura da Solução

### Fluxo de Cadastro (Dialog de Novo Ativo)

```text
+----------------------------------+
|  Dialog: Novo Ativo              |
+----------------------------------+
|                                  |
|  Etapa 1: Selecione o Tipo       |
|  +----------------------------+  |
|  | [Select] Tipo de Ativo ▼   |  |
|  +----------------------------+  |
|                                  |
|  (Após selecionar, aparece:)     |
|                                  |
|  Etapa 2: Formulário Específico  |
|  +----------------------------+  |
|  | Campos do tipo selecionado |  |
|  | ...                        |  |
|  +----------------------------+  |
|                                  |
|  [Cancelar]          [Salvar]    |
+----------------------------------+
```

### Campos Fixos por Tipo

| Tipo | Campos do Formulário |
|------|----------------------|
| **Notebook** | Marca, Modelo, Numero de Serie, Data Aquisicao, Valor Aquisicao, Funcionario |
| **Celular** | Modelo, IMEI, Data Aquisicao, Valor Aquisicao, Funcionario |
| **Outros** (generico) | Nome, Marca, Modelo, Numero de Serie, IMEI, Descricao, Data Aquisicao, Valor Aquisicao, Funcionario, Empresa |

### Configuracao de Campos por Tipo de Ativo

Na tela de **Tipos de Ativos**, ao criar ou editar um tipo, havera um botao "Personalizar Formulario" que abre uma interface para definir quais campos aparecem no cadastro desse tipo.

---

## Estrutura de Dados

### Nova Coluna na Tabela `asset_types`

```sql
ALTER TABLE asset_types 
ADD COLUMN form_fields jsonb DEFAULT '[]';
```

O campo `form_fields` armazenara um array com a configuracao dos campos:

```json
[
  { "field": "marca", "required": true, "label": "Marca" },
  { "field": "modelo", "required": true, "label": "Modelo" },
  { "field": "numero_serie", "required": true, "label": "Numero de Serie" },
  { "field": "data_aquisicao", "required": true, "label": "Data de Aquisicao" },
  { "field": "valor_aquisicao", "required": true, "label": "Valor de Aquisicao" },
  { "field": "funcionario_id", "required": false, "label": "Funcionario Responsavel" }
]
```

### Campos Disponiveis (Pool de Campos)

| Campo | Tipo Input | Descricao |
|-------|------------|-----------|
| nome | text | Nome do ativo |
| marca | text | Marca/Fabricante |
| modelo | text | Modelo |
| numero_serie | text | Numero de serie |
| imei | text | IMEI (celulares) |
| chip_linha | text | Linha de chip |
| descricao | textarea | Descricao detalhada |
| data_aquisicao | date | Data de aquisicao |
| valor_aquisicao | number | Valor de compra |
| funcionario_id | combobox | Funcionario responsavel |
| empresa_id | select | Empresa |

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/pages/Ativos.tsx` | Modificar | Reformular dialog para fluxo em 2 passos |
| `src/pages/TiposAtivos.tsx` | Modificar | Adicionar botao "Personalizar Formulario" |
| `src/components/AssetFormBuilder.tsx` | Criar | Interface para configurar campos do formulario |
| `src/components/DynamicAssetForm.tsx` | Criar | Componente que renderiza formulario dinamico baseado na config |
| Migracao SQL | Criar | Adicionar coluna `form_fields` a tabela `asset_types` |

---

## Mudancas Detalhadas

### 1. Migracao: Adicionar Coluna `form_fields`

```sql
ALTER TABLE asset_types ADD COLUMN IF NOT EXISTS form_fields jsonb DEFAULT '[]';

-- Configuracao padrao para Notebook (se existir)
UPDATE asset_types SET form_fields = '[
  {"field":"marca","required":true,"label":"Marca"},
  {"field":"modelo","required":true,"label":"Modelo"},
  {"field":"numero_serie","required":true,"label":"Numero de Serie"},
  {"field":"data_aquisicao","required":true,"label":"Data de Aquisicao"},
  {"field":"valor_aquisicao","required":true,"label":"Valor de Aquisicao"},
  {"field":"funcionario_id","required":false,"label":"Funcionario Responsavel"}
]'::jsonb WHERE LOWER(name) LIKE '%notebook%';

-- Configuracao padrao para Celular (se existir)
UPDATE asset_types SET form_fields = '[
  {"field":"modelo","required":true,"label":"Modelo"},
  {"field":"imei","required":true,"label":"IMEI"},
  {"field":"data_aquisicao","required":true,"label":"Data de Aquisicao"},
  {"field":"valor_aquisicao","required":true,"label":"Valor de Aquisicao"},
  {"field":"funcionario_id","required":false,"label":"Funcionario Responsavel"}
]'::jsonb WHERE LOWER(name) LIKE '%celular%';
```

### 2. Novo Componente: DynamicAssetForm

Este componente recebe a configuracao de campos do tipo selecionado e renderiza o formulario dinamicamente:

```typescript
interface DynamicAssetFormProps {
  tipoId: string;
  formFields: FormFieldConfig[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function DynamicAssetForm({ tipoId, formFields, onSuccess, onCancel }: DynamicAssetFormProps) {
  // Renderiza campos baseado em formFields
  // Gera patrimonio automaticamente
  // Submete para API
}
```

### 3. Novo Componente: AssetFormBuilder

Interface para administradores configurarem os campos do formulario de cada tipo:

```text
+------------------------------------------+
| Personalizar Formulario: Notebook        |
+------------------------------------------+
|                                          |
| Campos Disponiveis      Campos Ativos    |
| +----------------+      +-------------+  |
| | [ ] Nome       |  ->  | [x] Marca   |  |
| | [ ] Chip Linha |      | [x] Modelo  |  |
| | [ ] Descricao  |      | [x] N. Serie|  |
| | [ ] Empresa    |      | [x] Data Aq.|  |
| +----------------+      | [x] Valor   |  |
|                         | [x] Func.   |  |
|                         +-------------+  |
|                                          |
| [Cancelar]               [Salvar Config] |
+------------------------------------------+
```

### 4. Alteracao em TiposAtivos.tsx

Adicionar botao na tabela e formulario para abrir o AssetFormBuilder:

```typescript
// Na TableRow de cada tipo
<Button 
  variant="ghost" 
  size="icon" 
  title="Personalizar formulario"
  onClick={() => openFormBuilder(tipo)}
>
  <Settings className="h-4 w-4" />
</Button>
```

### 5. Reformulacao de Ativos.tsx

Novo fluxo no dialog de cadastro:

```typescript
// Estado para controlar etapas
const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);
const tipoSelecionado = tipos.find(t => t.id === selectedTipoId);

// Render
{!selectedTipoId ? (
  // Etapa 1: Selecao do tipo
  <div className="space-y-4">
    <Label>Selecione o Tipo de Ativo</Label>
    <Select onValueChange={setSelectedTipoId}>
      <SelectTrigger>
        <SelectValue placeholder="Escolha o tipo..." />
      </SelectTrigger>
      <SelectContent>
        {tipos.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
) : (
  // Etapa 2: Formulario dinamico
  <DynamicAssetForm
    tipoId={selectedTipoId}
    formFields={tipoSelecionado?.form_fields || []}
    onSuccess={handleFormSuccess}
    onCancel={() => setSelectedTipoId(null)}
  />
)}
```

---

## Resultado Esperado

1. **Cadastro simplificado**: Usuario primeiro escolhe o tipo, depois ve apenas os campos relevantes
2. **Formularios especificos**: Celular mostra campos de celular, Notebook mostra campos de notebook
3. **Personalizacao**: Admin pode configurar quais campos aparecem para cada tipo de ativo
4. **Consistencia**: Todos os tipos usam o mesmo fluxo, mas com campos diferentes
5. **Escalabilidade**: Facil adicionar novos tipos com configuracoes proprias

---

## Comportamento Especial

- Se o tipo nao tiver `form_fields` configurado, exibe formulario generico com todos os campos
- Patrimonio e sempre gerado automaticamente (nao aparece no formulario)
- Status e calculado automaticamente (disponivel se sem funcionario, em_uso se com funcionario)

