import { useState } from "react";
import { useContratoItens, ContratoItem } from "@/hooks/useContratoItens";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useEmpresas } from "@/hooks/useEmpresas";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UserPlus, Undo2, Trash2, Edit, Package, Users, DollarSign, Box } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  disponivel: "bg-green-500/10 text-green-700 dark:text-green-300",
  em_uso: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  manutencao: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  devolvido: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Manutenção",
  devolvido: "Devolvido",
};

interface ContratoItensProps {
  contratoId: string;
}

export function ContratoItens({ contratoId }: ContratoItensProps) {
  const { itens, isLoading, createItem, updateItem, deleteItem, atribuirItem, devolverItem } = useContratoItens(contratoId);
  const { funcionarios } = useFuncionarios();
  const { empresas } = useEmpresas();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContratoItem | null>(null);
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false);
  const [atribuirItemId, setAtribuirItemId] = useState<string | null>(null);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState("");

  const [formData, setFormData] = useState({
    identificador: "",
    descricao: "",
    funcionario_id: "",
    empresa_id: "",
    valor_mensal: "",
    observacoes: "",
  });

  const activeFuncionarios = funcionarios.filter((f) => f.active !== false);

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ identificador: "", descricao: "", funcionario_id: "", empresa_id: "", valor_mensal: "", observacoes: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      contrato_id: contratoId,
      identificador: formData.identificador || null,
      descricao: formData.descricao || null,
      funcionario_id: formData.funcionario_id || null,
      empresa_id: formData.empresa_id || null,
      valor_mensal: formData.valor_mensal ? parseFloat(formData.valor_mensal) : null,
      observacoes: formData.observacoes || null,
    };

    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        ...payload,
        status: payload.funcionario_id ? "em_uso" : "disponivel",
      });
    } else {
      await createItem.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: ContratoItem) => {
    setEditingItem(item);
    setFormData({
      identificador: item.identificador || "",
      descricao: item.descricao || "",
      funcionario_id: item.funcionario_id || "",
      empresa_id: item.empresa_id || "",
      valor_mensal: item.valor_mensal?.toString() || "",
      observacoes: item.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleAtribuir = (itemId: string) => {
    setAtribuirItemId(itemId);
    setSelectedFuncionarioId("");
    setAtribuirDialogOpen(true);
  };

  const confirmAtribuir = async () => {
    if (atribuirItemId && selectedFuncionarioId) {
      await atribuirItem.mutateAsync({ itemId: atribuirItemId, funcionarioId: selectedFuncionarioId });
      setAtribuirDialogOpen(false);
    }
  };

  // KPIs
  const totalItens = itens.length;
  const emUso = itens.filter((i) => i.status === "em_uso").length;
  const disponiveis = itens.filter((i) => i.status === "disponivel").length;
  const custoMensal = itens.reduce((sum, i) => sum + (i.valor_mensal || 0), 0);

  const kpis = [
    { icon: Box, label: "Total", value: totalItens, color: "bg-violet-500/10 text-violet-600" },
    { icon: Users, label: "Em uso", value: emUso, color: "bg-blue-500/10 text-blue-600" },
    { icon: Package, label: "Disponíveis", value: disponiveis, color: "bg-green-500/10 text-green-600" },
    { icon: DollarSign, label: "Custo mensal", value: `R$ ${custoMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "bg-orange-500/10 text-orange-600" },
  ];

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-sm font-semibold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Itens do Contrato</CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificador</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => {
                const func = funcionarios.find((f) => f.id === item.funcionario_id);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.identificador || "-"}</TableCell>
                    <TableCell>{item.descricao || "-"}</TableCell>
                    <TableCell>{func?.nome || "-"}</TableCell>
                    <TableCell>
                      {item.valor_mensal ? `R$ ${item.valor_mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", statusColors[item.status] || "")}>
                        {statusLabels[item.status] || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {item.status !== "em_uso" && (
                        <Button variant="ghost" size="icon" onClick={() => handleAtribuir(item.id)} title="Atribuir">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                      {item.status === "em_uso" && (
                        <Button variant="ghost" size="icon" onClick={() => devolverItem.mutate(item.id)} title="Devolver">
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {itens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum item cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog criar/editar item */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Adicionar Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Identificador (Série/Tag)</Label>
                <Input value={formData.identificador} onChange={(e) => setFormData({ ...formData, identificador: e.target.value })} placeholder="Ex: SN-12345" />
              </div>
              <div className="space-y-2">
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" step="0.01" value={formData.valor_mensal} onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Ex: Coletor Honeywell CT60" />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={formData.empresa_id} onValueChange={(v) => setFormData({ ...formData, empresa_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <FuncionarioCombobox
                  value={formData.funcionario_id}
                  onValueChange={(v) => setFormData({ ...formData, funcionario_id: v })}
                  funcionarios={activeFuncionarios}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                {editingItem ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog atribuir */}
      <Dialog open={atribuirDialogOpen} onOpenChange={setAtribuirDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <FuncionarioCombobox
                value={selectedFuncionarioId}
                onValueChange={setSelectedFuncionarioId}
                funcionarios={activeFuncionarios}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAtribuir} disabled={!selectedFuncionarioId || atribuirItem.isPending}>
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
