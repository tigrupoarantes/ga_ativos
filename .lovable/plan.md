

## Plano: Adicionar Campo Código FIPE ao Cadastro de Veículos

### Análise

Após verificar a planilha e o banco de dados:
- A coluna `codigo_fipe` **já existe** na tabela `veiculos`
- Os códigos FIPE da planilha **já foram importados** (ex: AYH7F87 → 5228-0)
- O que falta é apenas **adicionar o campo no formulário** de cadastro/edição

---

### O Que Será Feito

#### 1. Modificar `src/pages/Veiculos.tsx`

Adicionar o campo `codigo_fipe` no formulário:

| Localização | Descrição |
|-------------|-----------|
| State `formData` | Adicionar campo `codigo_fipe: ""` |
| Função `resetForm()` | Incluir reset do `codigo_fipe` |
| Função `handleEdit()` | Carregar valor existente |
| Função `saveVeiculo()` | Incluir no objeto de salvamento |
| JSX do formulário | Adicionar input ao lado do campo Chassi |

---

### 2. Layout do Formulário (Nova Linha)

O campo será adicionado na aba "Dados", após a linha de Placa/Renavam/Chassi:

```text
Placa *     | Renavam      | Chassi         | Código FIPE
[ABC1D23]   | [00000000000] | [9BWZ...251]   | [5228-0]
```

---

### 3. Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Veiculos.tsx` | Adicionar campo `codigo_fipe` ao formulário |

---

### Resultado Esperado

Após a implementação:
- Campo "Código FIPE" visível no cadastro de veículos
- Ao editar um veículo, o código FIPE existente será carregado
- Possibilidade de inserir/editar o código FIPE manualmente
- Integração mantida com a consulta FIPE existente

