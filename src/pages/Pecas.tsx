import { useState } from "react";
import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, Plus, MoreHorizontal, Search, Pencil, Trash2, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { usePecas, PecaInsert } from "@/hooks/usePecas";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export default function Pecas() {
  const { pecas, pecasEstoqueBaixo, isLoading, createPeca, updatePeca, deletePeca, ajustarEstoque } = usePecas();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAjusteDialogOpen, setIsAjusteDialogOpen] = useState(false);
  const [editingPeca, setEditingPeca] = useState<typeof pecas[0] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; nome: string } | null>(null);

  const [formData, setFormData] = useState<PecaInsert>({
    nome: "",
    codigo: null,
    descricao: null,
    quantidade_estoque: 0,
    estoque_minimo: 5,
    preco_unitario: null,
    unidade: "UN",
    fornecedor: null,
    categoria: null,
    localizacao: null,
    active: true,
  });

  const [ajusteData, setAjusteData] = useState({
    tipo: "entrada" as "entrada" | "saida",
    quantidade: "",
    motivo: "",
  });

  const filteredPecas = pecas.filter((peca) =>
    peca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (peca?: typeof pecas[0]) => {
    if (peca) {
      setEditingPeca(peca);
      setFormData({
        nome: peca.nome,
        codigo: peca.codigo,
        descricao: peca.descricao,
        quantidade_estoque: peca.quantidade_estoque,
        estoque_minimo: peca.estoque_minimo,
        preco_unitario: peca.preco_unitario,
        unidade: peca.unidade,
        fornecedor: peca.fornecedor,
        categoria: peca.categoria,
        localizacao: peca.localizacao,
        active: peca.active,
      });
    } else {
      setEditingPeca(null);
      setFormData({
        nome: "",
        codigo: null,
        descricao: null,
        quantidade_estoque: 0,
        estoque_minimo: 5,
        preco_unitario: null,
        unidade: "UN",
        fornecedor: null,
        categoria: null,
        localizacao: null,
        active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPeca) {
      await updatePeca.mutateAsync({ id: editingPeca.id, ...formData });
    } else {
      await createPeca.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDeleteClick = (peca: typeof pecas[0]) => {
    setItemToDelete({ id: peca.id, nome: peca.nome });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deletePeca.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openAjusteDialog = (peca: typeof pecas[0], tipo: "entrada" | "saida") => {
    setEditingPeca(peca);
    setAjusteData({ tipo, quantidade: "", motivo: "" });
    setIsAjusteDialogOpen(true);
  };

  const handleAjuste = async () => {
    if (!editingPeca || !ajusteData.quantidade) return;
    await ajustarEstoque.mutateAsync({
      id: editingPeca.id,
      tipo: ajusteData.tipo,
      quantidade: parseInt(ajusteData.quantidade),
      motivo: ajusteData.motivo || undefined,
    });
    setIsAjusteDialogOpen(false);
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Peças e Estoque"
          description="Gerencie o estoque de peças"
          icon={Package}
        />

        {pecasEstoqueBaixo.length > 0 && (
          <Card className="border-yellow-500 bg-yellow-500/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  {pecasEstoqueBaixo.length} peça(s) com estoque baixo
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar peça..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Peça
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">Carregando...</div>
            ) : filteredPecas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma peça cadastrada</h3>
                <p className="text-muted-foreground max-w-sm">
                  Cadastre peças para controlar o estoque da oficina.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Estoque</TableHead>
                    <TableHead>Preço Unit.</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPecas.map((peca) => {
                    const estoqueBaixo = peca.estoque_minimo && peca.quantidade_estoque <= peca.estoque_minimo;
                    return (
                      <TableRow key={peca.id}>
                        <TableCell className="font-mono">{peca.codigo || "-"}</TableCell>
                        <TableCell>
                          <div className="font-medium">{peca.nome}</div>
                          {peca.descricao && (
                            <div className="text-sm text-muted-foreground">{peca.descricao}</div>
                          )}
                        </TableCell>
                        <TableCell>{peca.categoria || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={estoqueBaixo ? "destructive" : "secondary"}>
                            {peca.quantidade_estoque} {peca.unidade}
                          </Badge>
                          {peca.estoque_minimo && (
                            <div className="text-xs text-muted-foreground">
                              Mín: {peca.estoque_minimo}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(peca.preco_unitario)}</TableCell>
                        <TableCell>{peca.fornecedor || "-"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openAjusteDialog(peca, "entrada")}>
                                <ArrowUp className="h-4 w-4 mr-2 text-green-500" />
                                Entrada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAjusteDialog(peca, "saida")}>
                                <ArrowDown className="h-4 w-4 mr-2 text-red-500" />
                                Saída
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenDialog(peca)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(peca)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Criar/Editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPeca ? "Editar Peça" : "Nova Peça"}</DialogTitle>
              <DialogDescription>Preencha os dados da peça</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.codigo || ""}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={formData.quantidade_estoque}
                    onChange={(e) =>
                      setFormData({ ...formData, quantidade_estoque: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.estoque_minimo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, estoque_minimo: e.target.value ? parseInt(e.target.value) : null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select
                    value={formData.unidade || "UN"}
                    onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="CX">CX</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço Unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_unitario || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, preco_unitario: e.target.value ? parseFloat(e.target.value) : null })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={formData.categoria || ""}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input
                    value={formData.fornecedor || ""}
                    onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value || null })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input
                    value={formData.localizacao || ""}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value || null })}
                    placeholder="Ex: Prateleira A1"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPeca.isPending || updatePeca.isPending}>
                  {editingPeca ? "Salvar" : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Ajuste de Estoque */}
        <Dialog open={isAjusteDialogOpen} onOpenChange={setIsAjusteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {ajusteData.tipo === "entrada" ? "Entrada de Estoque" : "Saída de Estoque"}
              </DialogTitle>
              <DialogDescription>
                {editingPeca?.nome} - Estoque atual: {editingPeca?.quantidade_estoque} {editingPeca?.unidade}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={ajusteData.quantidade}
                  onChange={(e) => setAjusteData({ ...ajusteData, quantidade: e.target.value })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={ajusteData.motivo}
                  onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                  placeholder="Descreva o motivo (opcional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAjusteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAjuste} disabled={ajustarEstoque.isPending || !ajusteData.quantidade}>
                {ajusteData.tipo === "entrada" ? (
                  <>
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Registrar Entrada
                  </>
                ) : (
                  <>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Registrar Saída
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.nome || ""}
        itemType="peça"
        isLoading={deletePeca.isPending}
      />
    </OficinaLayout>
  );
}
