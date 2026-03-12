-- Lotes de despesa de frota (um por importação/fatura)
CREATE TABLE lotes_despesa_veiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pedagio', 'combustivel', 'outros')),
  fornecedor TEXT,
  nota_fiscal TEXT,
  periodo_referencia DATE NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  qtd_veiculos INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'importado' CHECK (status IN ('importado', 'aprovado', 'pago')),
  observacoes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Linhas de despesa por veículo dentro de um lote
CREATE TABLE despesas_veiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id UUID NOT NULL REFERENCES lotes_despesa_veiculo(id) ON DELETE CASCADE,
  veiculo_placa TEXT NOT NULL,
  condutor TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  rateio_1_empresa TEXT,
  rateio_1_valor NUMERIC(12,2),
  rateio_2_empresa TEXT,
  rateio_2_valor NUMERIC(12,2),
  observacoes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_despesas_veiculo_lote  ON despesas_veiculo(lote_id);
CREATE INDEX idx_despesas_veiculo_placa ON despesas_veiculo(veiculo_placa);
CREATE INDEX idx_lotes_despesa_tipo     ON lotes_despesa_veiculo(tipo);
CREATE INDEX idx_lotes_despesa_periodo  ON lotes_despesa_veiculo(periodo_referencia DESC);
