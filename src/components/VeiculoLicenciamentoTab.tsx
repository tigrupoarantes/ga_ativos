import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface LicenciamentoData {
  licenciamento_valor: string;
  licenciamento_vencimento: string;
  licenciamento_situacao: string;
  ipva_valor: string;
  ipva_vencimento: string;
  ipva_situacao: string;
  restricao: boolean;
  restricao_descricao: string;
  ano_fabricacao: string;
}

interface VeiculoLicenciamentoTabProps {
  data: LicenciamentoData;
  onChange: (data: Partial<LicenciamentoData>) => void;
}

export function VeiculoLicenciamentoTab({ data, onChange }: VeiculoLicenciamentoTabProps) {
  const anoAtual = new Date().getFullYear();
  const anoFabricacao = data.ano_fabricacao ? parseInt(data.ano_fabricacao) : null;
  const veiculoIsento = anoFabricacao && anoFabricacao <= anoAtual - 20;

  return (
    <div className="space-y-6 pt-4">
      {/* Seção Licenciamento */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Licenciamento</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="licenciamento_valor">Valor (R$)</Label>
            <Input
              id="licenciamento_valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={data.licenciamento_valor}
              onChange={(e) => onChange({ licenciamento_valor: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenciamento_vencimento">Vencimento</Label>
            <Input
              id="licenciamento_vencimento"
              type="date"
              value={data.licenciamento_vencimento}
              onChange={(e) => onChange({ licenciamento_vencimento: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenciamento_situacao">Situação</Label>
            <Select 
              value={data.licenciamento_situacao} 
              onValueChange={(v) => onChange({ licenciamento_situacao: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="nao_pago">Não Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Seção IPVA */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b pb-2">
          <h3 className="text-lg font-semibold">IPVA</h3>
          {veiculoIsento && (
            <Badge variant="secondary" className="bg-status-success/10 text-status-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              Veículo com +20 anos - Possível Isenção
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ipva_valor">Valor (R$)</Label>
            <Input
              id="ipva_valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={data.ipva_valor}
              onChange={(e) => onChange({ ipva_valor: e.target.value })}
              disabled={data.ipva_situacao === "isento"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ipva_vencimento">Vencimento</Label>
            <Input
              id="ipva_vencimento"
              type="date"
              value={data.ipva_vencimento}
              onChange={(e) => onChange({ ipva_vencimento: e.target.value })}
              disabled={data.ipva_situacao === "isento"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ipva_situacao">Situação</Label>
            <Select 
              value={data.ipva_situacao} 
              onValueChange={(v) => onChange({ ipva_situacao: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="nao_pago">Não Pago</SelectItem>
                <SelectItem value="isento">Isento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Seção Restrição */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Restrição</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Switch
              id="restricao"
              checked={data.restricao}
              onCheckedChange={(checked) => onChange({ restricao: checked })}
            />
            <Label htmlFor="restricao" className="flex items-center gap-2">
              Possui Restrição
              {data.restricao && (
                <AlertTriangle className="h-4 w-4 text-status-warning" />
              )}
            </Label>
          </div>
          
          {data.restricao && (
            <div className="space-y-2">
              <Label htmlFor="restricao_descricao">Descrição da Restrição</Label>
              <Textarea
                id="restricao_descricao"
                placeholder="Descreva a restrição do veículo..."
                value={data.restricao_descricao}
                onChange={(e) => onChange({ restricao_descricao: e.target.value })}
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
