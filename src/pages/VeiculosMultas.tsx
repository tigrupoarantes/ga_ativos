import { useState } from "react";
import { VehicleLayout } from "@/components/VehicleLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { useVeiculosMultas } from "@/hooks/useVeiculosMultas";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataTablePagination } from "@/components/DataTablePagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusOptions = ["Pendente", "Pago", "Recorrido", "Cancelado"];

export default function VeiculosMultas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { multas, isLoading, createMulta, updateMulta, deleteMulta } = useVeiculosMultas();
  const { veiculos } = useVeiculos();
  const { funcionarios } = useFuncionarios();

  const [formData, setFormData] = useState({
    veiculo_placa: "",
    funcionario_responsavel_id: "",
    data_infracao: "",
    descricao_infracao: "",
    codigo_infracao: "",
    local_infracao: "",
    valor_multa: "",
    pontos: "",
    status: "Pendente",
    observacoes: "",
  });

  const filteredMultas = multas.filter((multa) => {
    const search = debouncedSearch.toLowerCase();
    return (
      multa.veiculo_placa?.toLowerCase().includes(search) ||
      multa.descricao_infracao?.toLowerCase().includes(search) ||
      multa.codigo_infracao?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredMultas.length / itemsPerPage);
  const paginatedMultas = filteredMultas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      veiculo_placa: formData.veiculo_placa,
      funcionario_responsavel_id: formData.funcionario_responsavel_id || null,
      data_infracao: formData.data_infracao,
      descricao_infracao: formData.descricao_infracao,
      codigo_infracao: formData.codigo_infracao || null,
      local_infracao: formData.local_infracao || null,
      valor_multa: formData.valor_multa ? parseFloat(formData.valor_multa) : null,
      pontos: formData.pontos ? parseInt(formData.pontos) : null,
      status: formData.status,
      observacoes: formData.observacoes || null,
    };

    if (editingId) {
      await updateMulta.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMulta.mutateAsync(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      veiculo_placa: "",
      funcionario_responsavel_id: "",
      data_infracao: "",
      descricao_infracao: "",
      codigo_infracao: "",
      local_infracao: "",
      valor_multa: "",
      pontos: "",
      status: "Pendente",
      observacoes: "",
    });
    setEditingId(null);
  };

  const handleEdit = (multa: any) => {
    setFormData({
      veiculo_placa: multa.veiculo_placa || "",
      funcionario_responsavel_id: multa.funcionario_responsavel_id || "",
      data_infracao: multa.data_infracao || "",
      descricao_infracao: multa.descricao_infracao || "",
      codigo_infracao: multa.codigo_infracao || "",
      local_infracao: multa.local_infracao || "",
      valor_multa: multa.valor_multa?.toString() || "",
      pontos: multa.pontos?.toString() || "",
      status: multa.status || "Pendente",
      observacoes: multa.observacoes || "",
    });
    setEditingId(multa.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteMulta.mutateAsync(id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pago":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Pendente":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "Recorrido":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "Cancelado":
        return "bg-muted text-muted-foreground";
      default:
        return "";
    }
  };

  return (
    <VehicleLayout>
      <PageHeader
        title="Multas de Veículos"
        description="Controle de infrações e multas de trânsito"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar multas..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Multa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Multa" : "Registrar Multa"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Veículo *</Label>
                      <Select
                        value={formData.veiculo_placa}
                        onValueChange={(value) =>
                          setFormData({ ...formData, veiculo_placa: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o veículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {veiculos.map((v) => (
                            <SelectItem key={v.id} value={v.placa}>
                              {v.placa} - {v.marca} {v.modelo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Select
                        value={formData.funcionario_responsavel_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, funcionario_responsavel_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {funcionarios.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data da Infração *</Label>
                      <Input
                        type="date"
                        value={formData.data_infracao}
                        onChange={(e) =>
                          setFormData({ ...formData, data_infracao: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código da Infração</Label>
                      <Input
                        value={formData.codigo_infracao}
                        onChange={(e) =>
                          setFormData({ ...formData, codigo_infracao: e.target.value })
                        }
                        placeholder="Ex: 746-00"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Descrição da Infração *</Label>
                      <Input
                        value={formData.descricao_infracao}
                        onChange={(e) =>
                          setFormData({ ...formData, descricao_infracao: e.target.value })
                        }
                        placeholder="Ex: Avançar sinal vermelho"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Local da Infração</Label>
                      <Input
                        value={formData.local_infracao}
                        onChange={(e) =>
                          setFormData({ ...formData, local_infracao: e.target.value })
                        }
                        placeholder="Ex: Av. Paulista, 1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_multa}
                        onChange={(e) =>
                          setFormData({ ...formData, valor_multa: e.target.value })
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pontos</Label>
                      <Input
                        type="number"
                        value={formData.pontos}
                        onChange={(e) =>
                          setFormData({ ...formData, pontos: e.target.value })
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={formData.observacoes}
                        onChange={(e) =>
                          setFormData({ ...formData, observacoes: e.target.value })
                        }
                        placeholder="Observações adicionais..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMulta.isPending || updateMulta.isPending}>
                      {editingId ? "Atualizar" : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Pontos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMultas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          Nenhuma multa encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedMultas.map((multa) => (
                        <TableRow key={multa.id}>
                          <TableCell className="font-medium">{multa.veiculo_placa}</TableCell>
                          <TableCell>
                            {format(new Date(multa.data_infracao), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {multa.descricao_infracao}
                          </TableCell>
                          <TableCell>
                            {multa.valor_multa
                              ? `R$ ${multa.valor_multa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "-"}
                          </TableCell>
                          <TableCell>{multa.pontos || "-"}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(multa.status || "")} variant="outline">
                              {multa.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(multa)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir multa?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(multa.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalCount={filteredMultas.length}
                pageSize={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </VehicleLayout>
  );
}
