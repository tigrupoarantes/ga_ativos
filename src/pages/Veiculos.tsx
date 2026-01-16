import { useState } from "react";
import { VehicleLayout } from "@/components/VehicleLayout";
import { PageHeader } from "@/components/PageHeader";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useEmpresas } from "@/hooks/useEmpresas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, Car } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  disponivel: "bg-status-success/10 text-status-success",
  em_uso: "bg-status-info/10 text-status-info",
  manutencao: "bg-status-warning/10 text-status-warning",
  baixado: "bg-status-error/10 text-status-error",
};

export default function Veiculos() {
  const { veiculos, isLoading, createVeiculo, updateVeiculo, deleteVeiculo } = useVeiculos();
  const { funcionarios } = useFuncionarios();
  const { empresas } = useEmpresas();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    placa: "",
    marca: "",
    modelo: "",
    ano_fabricacao: "",
    ano_modelo: "",
    cor: "",
    combustivel: "",
    tipo: "",
    chassi: "",
    renavam: "",
    km_atual: "",
    status: "disponivel",
    funcionario_id: "",
    empresa_id: "",
  });

  const filteredVeiculos = veiculos.filter(
    (v) =>
      v.placa?.toLowerCase().includes(search.toLowerCase()) ||
      v.marca?.toLowerCase().includes(search.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      ano_fabricacao: formData.ano_fabricacao ? parseInt(formData.ano_fabricacao) : null,
      ano_modelo: formData.ano_modelo ? parseInt(formData.ano_modelo) : null,
      km_atual: formData.km_atual ? parseInt(formData.km_atual) : null,
    };
    if (editingId) {
      await updateVeiculo.mutateAsync({ id: editingId, ...data });
    } else {
      await createVeiculo.mutateAsync(data);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      placa: "",
      marca: "",
      modelo: "",
      ano_fabricacao: "",
      ano_modelo: "",
      cor: "",
      combustivel: "",
      tipo: "",
      chassi: "",
      renavam: "",
      km_atual: "",
      status: "disponivel",
      funcionario_id: "",
      empresa_id: "",
    });
  };

  const handleEdit = (veiculo: typeof veiculos[0]) => {
    setEditingId(veiculo.id);
    setFormData({
      placa: veiculo.placa || "",
      marca: veiculo.marca || "",
      modelo: veiculo.modelo || "",
      ano_fabricacao: veiculo.ano_fabricacao?.toString() || "",
      ano_modelo: veiculo.ano_modelo?.toString() || "",
      cor: veiculo.cor || "",
      combustivel: veiculo.combustivel || "",
      tipo: veiculo.tipo || "",
      chassi: veiculo.chassi || "",
      renavam: veiculo.renavam || "",
      km_atual: veiculo.km_atual?.toString() || "",
      status: veiculo.status || "disponivel",
      funcionario_id: veiculo.funcionario_id || "",
      empresa_id: veiculo.empresa_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este veículo?")) {
      await deleteVeiculo.mutateAsync(id);
    }
  };

  return (
    <VehicleLayout>
      <div className="space-y-6">
        <PageHeader
          title="Veículos"
          description="Gerencie a frota de veículos"
          icon={Car}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar veículos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Veículo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="placa">Placa *</Label>
                      <Input
                        id="placa"
                        value={formData.placa}
                        onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca *</Label>
                      <Input
                        id="marca"
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modelo">Modelo *</Label>
                      <Input
                        id="modelo"
                        value={formData.modelo}
                        onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ano_fabricacao">Ano Fab.</Label>
                      <Input
                        id="ano_fabricacao"
                        type="number"
                        value={formData.ano_fabricacao}
                        onChange={(e) => setFormData({ ...formData, ano_fabricacao: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ano_modelo">Ano Mod.</Label>
                      <Input
                        id="ano_modelo"
                        type="number"
                        value={formData.ano_modelo}
                        onChange={(e) => setFormData({ ...formData, ano_modelo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cor">Cor</Label>
                      <Input
                        id="cor"
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="combustivel">Combustível</Label>
                      <Select value={formData.combustivel} onValueChange={(v) => setFormData({ ...formData, combustivel: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="etanol">Etanol</SelectItem>
                          <SelectItem value="flex">Flex</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="eletrico">Elétrico</SelectItem>
                          <SelectItem value="hibrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="carro">Carro</SelectItem>
                          <SelectItem value="moto">Moto</SelectItem>
                          <SelectItem value="caminhao">Caminhão</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="utilitario">Utilitário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponivel">Disponível</SelectItem>
                          <SelectItem value="em_uso">Em Uso</SelectItem>
                          <SelectItem value="manutencao">Manutenção</SelectItem>
                          <SelectItem value="baixado">Baixado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="km_atual">KM Atual</Label>
                      <Input
                        id="km_atual"
                        type="number"
                        value={formData.km_atual}
                        onChange={(e) => setFormData({ ...formData, km_atual: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="funcionario_id">Responsável</Label>
                      <Select value={formData.funcionario_id} onValueChange={(v) => setFormData({ ...formData, funcionario_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {funcionarios.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa_id">Empresa</Label>
                      <Select value={formData.empresa_id} onValueChange={(v) => setFormData({ ...formData, empresa_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresas.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createVeiculo.isPending || updateVeiculo.isPending}>
                      {editingId ? "Salvar" : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVeiculos.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell className="font-medium">{veiculo.placa}</TableCell>
                      <TableCell>{veiculo.marca} {veiculo.modelo}</TableCell>
                      <TableCell>{veiculo.ano_modelo || "-"}</TableCell>
                      <TableCell>{veiculo.km_atual?.toLocaleString() || "-"}</TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", statusColors[veiculo.status || "disponivel"])}>
                          {veiculo.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{(veiculo as any).funcionario?.nome || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(veiculo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(veiculo.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVeiculos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum veículo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </VehicleLayout>
  );
}
