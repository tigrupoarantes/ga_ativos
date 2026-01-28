

## Plano: Corrigir E-mail do William Alves Cintra

### Situação Atual

| Campo | Banco de Dados | Planilha |
|-------|----------------|----------|
| CPF | 35755389802 | 35755389802 |
| Nome | WILLIAM ALVES CINTRA | William Alves Cintra |
| E-mail | `null` | william.cintra@grupoarantes.emp.br |
| CNH | 3654872306 | 3654872306 |
| Condutor | true | - |

O registro existe e os dados de CNH foram atualizados, mas o e-mail não foi preenchido.

### Ação

Executar a atualização do campo `email`:

```sql
UPDATE funcionarios SET 
  email = 'william.cintra@grupoarantes.emp.br'
WHERE cpf = '35755389802' AND active = true;
```

### Resultado Esperado

O registro do William Alves Cintra terá o e-mail atualizado para `william.cintra@grupoarantes.emp.br`.

