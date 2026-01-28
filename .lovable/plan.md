

## Plano: Limpar Tabela de Veículos

### Situação Atual

| Tabela | Registros Ativos |
|--------|------------------|
| veiculos | **195** |
| veiculos_documentos | 0 |
| veiculos_historico_responsavel | 0 |
| veiculos_multas | 0 |
| ordens_servico | 0 |
| preventivas | 0 |

Não há dados relacionados (documentos, multas, ordens, etc.), então a limpeza é segura.

---

### Opções de Limpeza

**Opção 1 - Soft Delete (Recomendado)**

Marca todos os veículos como inativos (preserva histórico para auditoria):

```sql
UPDATE veiculos SET active = false WHERE active = true;
```

**Opção 2 - Hard Delete**

Remove permanentemente todos os registros:

```sql
DELETE FROM veiculos;
```

---

### Execução

Vou executar o **Soft Delete** para desativar os 195 veículos atuais. Isso permite:
- Manter histórico para auditoria
- Possibilidade de recuperação se necessário
- Os veículos não aparecerão mais na listagem

Após a limpeza, você poderá enviar a nova planilha para importação.

