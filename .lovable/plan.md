

## Plano: Atualizar Condutores com Dados de CNH (Arquivo Corrigido)

### Dados da Planilha

O arquivo atualizado contém **103 registros** de condutores com CPFs já formatados (sem pontos/traços):

| Campo | Descrição |
|-------|-----------|
| CPF | Número limpo (ex: 21901369897) |
| NOME | Nome completo do funcionário |
| EMAIL | E-mail do funcionário |
| CNH | Número da CNH |
| CATEGORIA | Categoria da CNH (A, B, AB, AC, AD, AE) |
| VENCIMENTO CNH | Data no formato DD/MM/YYYY |

### Ações a Executar

Para cada CPF da planilha, atualizar o registro correspondente na tabela `funcionarios`:

1. Definir `is_condutor = true`
2. Preencher `cnh_numero` com o número da CNH
3. Preencher `cnh_categoria` com a categoria
4. Converter e preencher `cnh_validade` (DD/MM/YYYY → YYYY-MM-DD)

### Tratamento de Casos Especiais

Serão ignorados dados inválidos:
- Antonio Carlos Pereira (03943999866) - sem dados de CNH
- Antonio Jose Limeira (14554190870) - CNH = "-"
- José Caetano Neto (12158569620) - CNH = "-"
- Kaio Stafussi Fernandes (36709345882) - categoria = "-"
- Registros com categoria vazia serão atualizados apenas com `is_condutor`, `cnh_numero` e `cnh_validade`

### Execução

Serão executados comandos UPDATE em lote no banco de dados:

```sql
-- Exemplo de atualização
UPDATE funcionarios SET 
  is_condutor = true,
  cnh_numero = '1209387626',
  cnh_categoria = 'AB',
  cnh_validade = '2035-02-11'
WHERE cpf = '21901369897' AND active = true;
```

### Resultado Esperado

- 103 funcionários serão marcados como condutores
- Dados de CNH preenchidos para quem possui informações válidas
- Registros não encontrados pelo CPF serão ignorados (sem erro)

### Resumo Técnico

- **Tabela**: `funcionarios`
- **Campos atualizados**: `is_condutor`, `cnh_numero`, `cnh_categoria`, `cnh_validade`
- **Chave de busca**: CPF (campo `cpf`)
- **Filtro adicional**: `active = true`

