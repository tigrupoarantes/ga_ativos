

## Plano: Adicionar Exportação de Modelo CSV para Importação de Funcionários

### Objetivo

Criar um botão para baixar um arquivo CSV modelo (template) que o sistema reconhece, permitindo que o usuário preencha os dados no formato correto e importe sem erros.

### Funcionalidades

1. **Botão "Baixar Modelo"** - Exporta um CSV vazio com headers corretos
2. **Botão "Exportar Funcionários"** - Exporta os funcionários existentes no mesmo formato (para referência ou backup)

### Formato do CSV Modelo

O arquivo usará separador ponto-e-vírgula (`;`) que é padrão do Excel em português:

```csv
CPF;NOME;EMAIL;TELEFONE;CARGO;DEPARTAMENTO;EMPRESA;ATIVO
12345678901;João da Silva;joao@email.com;11999999999;Analista;TI;Empresa ABC;Ativo
```

**Colunas do modelo:**

| Coluna | Obrigatório | Descrição |
|--------|-------------|-----------|
| CPF | Sim | CPF sem pontuação (11 dígitos) |
| NOME | Sim | Nome completo |
| EMAIL | Não | E-mail do funcionário |
| TELEFONE | Não | Telefone com DDD |
| CARGO | Não | Cargo/função |
| DEPARTAMENTO | Não | Departamento ou centro de custo |
| EMPRESA | Não | Nome da empresa |
| ATIVO | Não | "Ativo" ou "Inativo" (padrão: Ativo) |

### Mudanças no Código

**Arquivo:** `src/components/ImportFuncionariosDialog.tsx`

1. **Adicionar função `downloadTemplate`:**
   - Gera CSV com headers e 2 linhas de exemplo
   - Usa BOM UTF-8 para caracteres especiais no Excel
   - Usa `;` como separador (compatível com Excel BR)

2. **Adicionar função `exportFuncionarios`:**
   - Busca funcionários ativos do banco
   - Exporta no mesmo formato do template

3. **Atualizar interface do Dialog:**
   - Adicionar seção "Baixar Modelo" antes do upload
   - Botões: "Modelo Vazio" e "Exportar Atuais"

### Interface do Dialog (Atualizada)

```text
┌─────────────────────────────────────────────────────┐
│  Importar Funcionários                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📥 Baixar Modelo CSV                               │
│  ┌─────────────────┐  ┌─────────────────────┐      │
│  │ Modelo Vazio    │  │ Exportar Atuais     │      │
│  └─────────────────┘  └─────────────────────┘      │
│                                                     │
│  Formato esperado: CPF;NOME;EMAIL;TELEFONE;...     │
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
const downloadTemplate = () => {
  const headers = ['CPF', 'NOME', 'EMAIL', 'TELEFONE', 'CARGO', 'DEPARTAMENTO', 'EMPRESA', 'ATIVO'];
  const exampleRows = [
    ['12345678901', 'Maria da Silva', 'maria@email.com', '11999999999', 'Analista', 'Financeiro', 'Empresa ABC', 'Ativo'],
    ['98765432100', 'João Santos', 'joao@email.com', '11988888888', 'Gerente', 'TI', 'Empresa XYZ', 'Ativo'],
  ];
  
  const csvContent = [
    headers.join(';'),
    ...exampleRows.map(row => row.join(';'))
  ].join('\n');
  
  // BOM for UTF-8 Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'modelo_funcionarios.csv';
  link.click();
};
```

### Resultado Esperado

1. Usuário baixa o modelo CSV
2. Preenche no Excel com seus dados
3. Salva como CSV (separado por ponto-e-vírgula)
4. Importa no sistema sem erros

