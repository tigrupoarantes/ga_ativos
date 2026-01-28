import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { VeiculoDocumentosSection } from "@/components/VeiculoDocumentosSection";
import { Shield, ShieldOff } from "lucide-react";

interface SegurosData {
  possui_seguro: boolean;
  seguro_vencimento: string;
  seguro_valor: string;
  seguro_apolice: string;
}

interface VeiculoSegurosTabProps {
  data: SegurosData;
  onChange: (data: Partial<SegurosData>) => void;
  veiculoPlaca: string | null;
  isEditing: boolean;
}

export function VeiculoSegurosTab({ data, onChange, veiculoPlaca, isEditing }: VeiculoSegurosTabProps) {
  // Verificar se seguro está vencido
  const hoje = new Date();
  const vencimento = data.seguro_vencimento ? new Date(data.seguro_vencimento) : null;
  const seguroVencido = vencimento && vencimento < hoje;
  const seguroProximoVencer = vencimento && !seguroVencido && 
    (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24) <= 30;

  return (
    <div className="space-y-6 pt-4">
      {/* Seção Seguro */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b pb-2">
          <h3 className="text-lg font-semibold">Seguro do Veículo</h3>
          {data.possui_seguro ? (
            seguroVencido ? (
              <Badge variant="destructive">
                <ShieldOff className="h-3 w-3 mr-1" />
                Seguro Vencido
              </Badge>
            ) : seguroProximoVencer ? (
              <Badge variant="secondary" className="bg-status-warning/10 text-status-warning">
                <Shield className="h-3 w-3 mr-1" />
                Vence em Breve
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-status-success/10 text-status-success">
                <Shield className="h-3 w-3 mr-1" />
                Segurado
              </Badge>
            )
          ) : (
            <Badge variant="outline">
              <ShieldOff className="h-3 w-3 mr-1" />
              Sem Seguro
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Switch
              id="possui_seguro"
              checked={data.possui_seguro}
              onCheckedChange={(checked) => onChange({ possui_seguro: checked })}
            />
            <Label htmlFor="possui_seguro">Possui Seguro</Label>
          </div>

          {data.possui_seguro && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seguro_vencimento">Vencimento</Label>
                <Input
                  id="seguro_vencimento"
                  type="date"
                  value={data.seguro_vencimento}
                  onChange={(e) => onChange({ seguro_vencimento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seguro_valor">Valor (R$)</Label>
                <Input
                  id="seguro_valor"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={data.seguro_valor}
                  onChange={(e) => onChange({ seguro_valor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seguro_apolice">Número da Apólice</Label>
                <Input
                  id="seguro_apolice"
                  value={data.seguro_apolice}
                  onChange={(e) => onChange({ seguro_apolice: e.target.value })}
                  placeholder="Ex: APO-2025-00001"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seção Documentos do Seguro */}
      {isEditing && veiculoPlaca && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Documentos do Seguro</h3>
          <p className="text-sm text-muted-foreground">
            Anexe a apólice e outros documentos relacionados ao seguro do veículo.
            Use a aba "Documentos" para gerenciar todos os arquivos.
          </p>
          <VeiculoDocumentosSection 
            veiculoPlaca={veiculoPlaca} 
            tipoFiltro={["Seguro", "Apólice"]}
          />
        </div>
      )}
    </div>
  );
}
