

## Plano: Atualizar Importação de Linhas com Template e Lógica Robusta

### Objetivo

Atualizar o `ImportLinhasDialog.tsx` para usar a mesma lógica do `ImportFuncionariosDialog.tsx`, incluindo:
1. Botão para baixar modelo CSV
2. Botão para exportar linhas atuais
3. Parser robusto para múltiplos formatos de CSV

### Formato do CSV Modelo

```csv
NUMERO;CPF_FUNCIONARIO;OPERADORA;PLANO;OBSERVACOES
11999999999;12345678901;Vivo;Corporativo 50GB;Linha principal
11888888888;;Claro;Dados 20GB;Linha backup
```

| Coluna | Obrigatório | Descrição |
|--------|-------------|-----------|
| NUMERO | Sim | Número da linha (apenas dígitos, 10-11) |
| CPF_FUNCIONARIO | Não | CPF para associar à linha |
| OPERADORA | Não | Vivo, Claro, TIM, Oi, etc. |
| PLANO | Não | Nome do plano |
| OBSERVACOES | Não | Observações adicionais |

### Mudanças no Código

**Arquivo:** `src/components/ImportLinhasDialog.tsx`

1. **Adicionar constantes do template:**
```typescript
const CSV_HEADERS = ['NUMERO', 'CPF_FUNCIONARIO', 'OPERADORA', 'PLANO', 'OBSERVACOES'];
const CSV_EXAMPLE_ROWS = [
  ['11999999999', '12345678901', 'Vivo', 'Corporativo 50GB', 'Linha principal'],
  ['11888888888', '', 'Claro', 'Dados 20GB', 'Linha backup'],
];
```

2. **Adicionar função `downloadCsv`:**
   - Reutiliza a lógica de BOM UTF-8 para Excel

3. **Adicionar função `downloadTemplate`:**
   - Gera CSV modelo com headers e exemplos

4. **Adicionar função `exportLinhas`:**
   - Exporta todas as linhas ativas no formato padrão

5. **Atualizar parser `parseCSVLine`:**
   - Suporta separador `;` (padrão Excel BR)
   - Suporta separador `,` 
   - Suporta formato especial `','`

6. **Atualizar interface do Dialog:**
   - Adicionar seção "Baixar Modelo CSV" com botões
   - Manter preview existente

### Interface do Dialog (Atualizada)

```text
┌─────────────────────────────────────────────────────┐
│  Importar Linhas Telefônicas                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📥 Baixar Modelo CSV                               │
│  ┌─────────────────┐  ┌─────────────────────┐      │
│  │ Modelo Vazio    │  │ Exportar Atuais     │      │
│  └─────────────────┘  └─────────────────────┘      │
│                                                     │
│  Formato: NUMERO;CPF_FUNCIONARIO;OPERADORA;...     │
│                                                     │
│  ─────────────────────────────────────────────     │
│                                                     │
│  📤 Selecionar Arquivo CSV                         │
│  [         Selecionar arquivo...           ]       │
│                                                     │
│  (Preview e botão importar aparecem aqui)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Código da Função de Download

```typescript
const downloadCsv = (content: string, filename: string) => {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const downloadTemplate = () => {
  const csvContent = [
    CSV_HEADERS.join(';'),
    ...CSV_EXAMPLE_ROWS.map(row => row.join(';'))
  ].join('\n');
  
  downloadCsv(csvContent, 'modelo_linhas_telefonicas.csv');
  toast.success('Modelo CSV baixado!');
};
```

### Mapeamento de Headers (Flexível)

```typescript
const headerMappings: Record<string, keyof LinhaRow> = {
  'numero': 'numero',
  'linha': 'numero',
  'telefone': 'numero',
  'cpf': 'cpf_funcionario',
  'cpf_funcionario': 'cpf_funcionario',
  'funcionario_cpf': 'cpf_funcionario',
  'operadora': 'operadora',
  'plano': 'plano',
  'observacoes': 'observacoes',
  'observacao': 'observacoes',
};
```

### Resultado Esperado

1. Usuário baixa modelo CSV no formato correto
2. Preenche no Excel com seus dados
3. Salva como CSV (separado por ponto-e-vírgula)
4. Importa no sistema com preview e validação
5. Linhas são criadas/atualizadas corretamente

