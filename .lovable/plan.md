

## Plano: Atualizar E-mails dos Condutores

### Objetivo

Aproveitar os dados da planilha para também atualizar o campo `email` dos funcionários que possuem e-mail cadastrado.

### Dados Disponíveis

A planilha contém **103 registros** com a coluna EMAIL. Destes:
- **~90 funcionários** possuem e-mail válido
- **~13 funcionários** não possuem e-mail (campo vazio ou "-")

### Ação

Para cada CPF da planilha que possua e-mail válido (não vazio e diferente de "-"), executar:

```sql
UPDATE funcionarios SET 
  email = 'email@dominio.com'
WHERE cpf = 'XXXXXXXXXXX' AND active = true;
```

### Lista de E-mails a Atualizar

| CPF | Nome | E-mail |
|-----|------|--------|
| 21901369897 | Adriana Gaiba Lopes Madeira | brkarantes272009@gmail.com |
| 27544791807 | Adriana Maila Martins | adriana@chokdistribuidora.com.br |
| 36448116877 | Alan Nascimento Muchiut | alan@brkarantes.com.br |
| 13258414807 | Alexandro Benedito de Oliveira | Alexandro.oliveira@brkarantes.com.br |
| ... | *(demais 85+ registros)* | ... |

### Registros sem E-mail (serão ignorados)

- 26837829858 - Adriano Rodrigo Previatto (vazio)
- 03943999866 - Antonio Carlos Pereira (vazio)
- 14554190870 - Antonio Jose Limeira (vazio)
- 66614620644 - Jose Aparecido Alves (vazio)
- 12158569620 - José Caetano Neto ("-")
- 04370489857 - Emanuel Martins ("-")
- 07178770864 - Laercio ("-")
- 44012784889 - Maria Laura Arantes ("-")

### Execução

Serão executados comandos UPDATE em lote, atualizando apenas o campo `email` para funcionários que:
1. Tenham CPF correspondente na base
2. Estejam ativos (`active = true`)
3. Possuam e-mail válido na planilha

### Resultado Esperado

- ~90 funcionários terão seus e-mails atualizados/preenchidos
- Funcionários sem e-mail na planilha permanecerão inalterados
- CPFs não encontrados serão ignorados

### Resumo Técnico

- **Tabela**: `funcionarios`
- **Campo atualizado**: `email`
- **Chave de busca**: CPF (campo `cpf`)
- **Filtro**: `active = true` e e-mail válido na planilha

