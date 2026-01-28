

## Plano: Dashboard de Veículos com Consulta FIPE em Massa

### Objetivo

Criar um dashboard na página de veículos com:
1. Total de veículos e estatísticas
2. Filtro por empresa
3. Botão para consultar tabela FIPE para todos os veículos

---

### 1. Cards de Estatísticas

Exibir no topo da página:

| Card | Métrica |
|------|---------|
| Total de Veículos | 137 |
| Com Valor FIPE | 0 (atualmente) |
| Sem Valor FIPE | 137 |
| Valor Total da Frota | R$ 0,00 (atualiza conforme FIPE) |

---

### 2. Filtro por Empresa

Empresas detectadas nos dados:
- J. Arantes Transportes (64 veículos)
- Chok Distribuidora (34 veículos)
- Sem empresa/Particular (19 veículos)
- G4 Arantes (10 veículos)
- Chokdoce CD (10 veículos)

O filtro permitirá:
- Selecionar uma empresa específica
- Opção "Todas as empresas"
- Opção "Sem empresa (Particular)"

---

### 3. Botão Consulta FIPE em Massa

Funcionalidades:
- Abre um dialog de progresso
- Processa veículos que têm código FIPE cadastrado
- Para veículos sem código FIPE, ignora ou mostra aviso
- Exibe barra de progresso durante a operação
- Mostra resultado final (quantos atualizados, quantos falharam)

---

### 4. Interface Visual

```text
+----------------------------------------------------------------------+
| Veículos                                                              |
| Gestão completa da frota                                              |
|                                                                       |
| [Lista] [Multas] [Histórico]                                          |
+----------------------------------------------------------------------+
|                                                                       |
| +----------+  +-----------+  +------------+  +----------------+       |
| |   137    |  |     0     |  |    137     |  |   R$ 0,00      |       |
| |  Total   |  | Com FIPE  |  | Sem FIPE   |  | Valor Frota    |       |
| +----------+  +-----------+  +------------+  +----------------+       |
|                                                                       |
| Empresa: [Todas as empresas ▼]    [Consultar FIPE em Massa]           |
|                                                                       |
+----------------------------------------------------------------------+
| [Buscar...]                          [Importar] [+ Novo Veículo]      |
+----------------------------------------------------------------------+
| Tabela de veículos...                                                 |
+----------------------------------------------------------------------+
```

---

### 5. Dialog de Consulta FIPE em Massa

```text
+----------------------------------------------------------+
| Consultar FIPE em Massa                              [X] |
+----------------------------------------------------------+
| Esta ação vai consultar o valor FIPE para todos os       |
| veículos que possuem código FIPE cadastrado.             |
|                                                          |
| Veículos com código FIPE: 0 de 137                       |
| Veículos sem código: 137                                 |
|                                                          |
| ⚠️ Veículos sem código FIPE serão ignorados.             |
|                                                          |
| [Cancelar]                    [Iniciar Consulta]         |
+----------------------------------------------------------+

// Durante execução:
+----------------------------------------------------------+
| Consultando FIPE...                                  [X] |
+----------------------------------------------------------+
| Processando: ABC1234 - VW Gol 2020                       |
|                                                          |
| [████████████░░░░░░░░] 60%  (60/100)                      |
|                                                          |
| ✓ Atualizados: 55                                        |
| ✗ Falhas: 5                                              |
|                                                          |
| [Cancelar]                                               |
+----------------------------------------------------------+
```

---

### 6. Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/VeiculosDashboard.tsx` | **Criar** - Componente com cards e filtros |
| `src/components/ConsultaFipeMassaDialog.tsx` | **Criar** - Dialog para consulta em massa |
| `src/pages/Veiculos.tsx` | **Modificar** - Integrar dashboard e filtro |
| `src/hooks/useVeiculos.ts` | **Modificar** - Adicionar filtro por empresa |

---

### 7. Detalhes Técnicos

#### 7.1 VeiculosDashboard.tsx

```typescript
// Componente que exibe:
// - 4 cards com estatísticas
// - Select para filtrar por empresa
// - Botão para abrir ConsultaFipeMassaDialog

interface VeiculosDashboardProps {
  veiculos: Veiculo[];
  empresas: Empresa[];
  empresaFilter: string | null;
  onEmpresaFilterChange: (empresaId: string | null) => void;
}
```

#### 7.2 ConsultaFipeMassaDialog.tsx

```typescript
// Dialog que:
// 1. Lista quantos veículos têm código FIPE
// 2. Inicia consultas em batch (com delay entre elas)
// 3. Mostra progresso em tempo real
// 4. Atualiza cada veículo via mutation
// 5. Exibe resumo final

interface ConsultaFipeMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculos: Veiculo[];
}
```

#### 7.3 Filtro por Empresa

```typescript
// Adicionar ao Veiculos.tsx:
const [empresaFilter, setEmpresaFilter] = useState<string | null>(null);

// Modificar filtragem:
const filteredVeiculos = veiculos.filter((v) => {
  const matchesSearch = v.placa?.toLowerCase().includes(search) || ...;
  const matchesEmpresa = !empresaFilter || 
    (empresaFilter === "particular" ? !v.empresa_id : v.empresa_id === empresaFilter);
  return matchesSearch && matchesEmpresa;
});
```

---

### 8. Fluxo da Consulta FIPE em Massa

```text
1. Usuário clica "Consultar FIPE em Massa"
      ↓
2. Dialog abre e lista veículos elegíveis
      ↓
3. Usuário confirma
      ↓
4. Para cada veículo com código_fipe:
   - Chama useFipeConsultaPorCodigo
   - Atualiza progresso
   - Aguarda 500ms (rate limiting)
      ↓
5. Exibe resumo (X atualizados, Y falhas)
      ↓
6. Invalida query de veículos
```

---

### 9. Limitações e Observações

- **Veículos sem código FIPE**: Não serão consultados automaticamente (requer seleção manual de marca/modelo)
- **Rate Limiting**: Delay de 500ms entre consultas para não sobrecarregar a API FIPE
- **Atualmente 0 veículos têm código FIPE**: O botão mostrará aviso sobre isso
- **Para consultar todos**: Usuário precisará editar cada veículo e usar a consulta individual por marca/modelo/ano

---

### 10. Resultado Esperado

Após implementação:
- Dashboard visual com métricas da frota
- Filtro funcional por empresa
- Botão de consulta em massa (funcional para veículos com código FIPE)
- Interface limpa seguindo o padrão Apple do sistema

