import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { ContratoMetrica, ContratoMetricaInsert } from "@/hooks/useContratoMetricas";

interface MetricasFormProps {
  metricas: ContratoMetrica[];
  onAdd: (metrica: ContratoMetricaInsert) => void;
  onDelete: (id: string) => void;
  contratoId: string;
  isAdding?: boolean;
}

export function MetricasForm({ metricas, onAdd, onDelete, contratoId, isAdding }: MetricasFormProps) {
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState("");
  const [valorUnitario, setValorUnitario] = useState("");
  const [metaMensal, setMetaMensal] = useState("");

  const handleAdd = () => {
    if (!nome.trim() || !unidade.trim()) return;
    onAdd({
      contrato_id: contratoId,
      nome: nome.trim(),
      unidade: unidade.trim(),
      valor_unitario: valorUnitario ? parseFloat(valorUnitario) : null,
      meta_mensal: metaMensal ? parseFloat(metaMensal) : null,
    });
    setNome("");
    setUnidade("");
    setValorUnitario("");
    setMetaMensal("");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">Métricas de Cobrança</Label>

      {/* Existing metricas */}
      {metricas.length > 0 && (
        <div className="space-y-2">
          {metricas.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
              <span className="flex-1 font-medium">{m.nome}</span>
              <span className="text-muted-foreground">{m.unidade}</span>
              {m.valor_unitario && (
                <span className="text-muted-foreground">R$ {m.valor_unitario}</span>
              )}
              {m.meta_mensal && (
                <span className="text-muted-foreground">Meta: {m.meta_mensal}</span>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(m.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new metrica */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Nome *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Páginas P&B"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidade *</Label>
          <Input
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            placeholder="páginas"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor Unit. (R$)</Label>
          <Input
            type="number"
            step="0.0001"
            value={valorUnitario}
            onChange={(e) => setValorUnitario(e.target.value)}
            placeholder="0,04"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Meta Mensal</Label>
          <Input
            type="number"
            value={metaMensal}
            onChange={(e) => setMetaMensal(e.target.value)}
            placeholder="10000"
            className="h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!nome.trim() || !unidade.trim() || isAdding}
          className="h-8"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
