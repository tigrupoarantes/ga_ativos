import { Car, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";

type Veiculo = Tables<"veiculos"> & {
  funcionario?: Tables<"funcionarios"> | null;
  empresa?: Tables<"empresas"> | null;
};

interface SelectOption {
  id: string;
  nome: string;
}

interface VeiculosDashboardProps {
  veiculos: Veiculo[];
  empresas: SelectOption[];
  empresaFilter: string | null;
  onEmpresaFilterChange: (empresaId: string | null) => void;
  onOpenFipeMassa: () => void;
}

export function VeiculosDashboard({
  veiculos,
  empresas,
  empresaFilter,
  onEmpresaFilterChange,
  onOpenFipeMassa,
}: VeiculosDashboardProps) {
  // Estatísticas
  const totalVeiculos = veiculos.length;
  const comFipe = veiculos.filter((v) => v.valor_fipe && v.valor_fipe > 0).length;
  const semFipe = totalVeiculos - comFipe;
  const valorTotalFrota = veiculos.reduce((acc, v) => acc + (v.valor_fipe || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalVeiculos}</p>
                <p className="text-sm text-muted-foreground">Total de Veículos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-success/10">
                <CheckCircle className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{comFipe}</p>
                <p className="text-sm text-muted-foreground">Com Valor FIPE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-status-warning/10">
                <XCircle className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{semFipe}</p>
                <p className="text-sm text-muted-foreground">Sem Valor FIPE</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(valorTotalFrota)}</p>
                <p className="text-sm text-muted-foreground">Valor Total da Frota</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro e Ações */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Empresa:</span>
          <Select
            value={empresaFilter || "todas"}
            onValueChange={(v) => onEmpresaFilterChange(v === "todas" ? null : v)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todas as empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              <SelectItem value="particular">Sem empresa (Particular)</SelectItem>
              <SelectItem value="alugado">Alugado</SelectItem>
              {empresas.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={onOpenFipeMassa}>
          <DollarSign className="h-4 w-4 mr-2" />
          Consultar FIPE em Massa
        </Button>
      </div>
    </div>
  );
}
