import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useTiposAtivos } from "@/hooks/useAtivos";
import { AssetFormBuilder, FormFieldConfig } from "@/components/AssetFormBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, FolderKanban, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export default function TiposAtivos() {
  const { tipos, isLoading, createTipo, updateTipo, deleteTipo } = useTiposAtivos();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [selectedTipoForBuilder, setSelectedTipoForBuilder] = useState<{
    id: string;
    name: string;
    form_fields: FormFieldConfig[];
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    prefix: "",
    depreciation_rate: "",
    useful_life_months: "",
  });

  const filteredTipos = tipos.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      prefix: formData.prefix.toUpperCase() || null,
      depreciation_rate: formData.depreciation_rate ? parseFloat(formData.depreciation_rate) : null,
      useful_life_months: formData.useful_life_months ? parseInt(formData.useful_life_months) : null,
    };
    if (editingId) {
      await updateTipo.mutateAsync({ id: editingId, ...data });
    } else {
      await createTipo.mutateAsync(data);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      prefix: "",
      depreciation_rate: "",
      useful_life_months: "",
    });
  };

  const handleEdit = (tipo: typeof tipos[0]) => {
    setEditingId(tipo.id);
    setFormData({
      name: tipo.name || "",
      description: tipo.description || "",
      category: tipo.category || "",
      prefix: (tipo as any).prefix || "",
      depreciation_rate: tipo.depreciation_rate?.toString() || "",
      useful_life_months: tipo.useful_life_months?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (tipo: typeof tipos[0]) => {
    setItemToDelete({ id: tipo.id, name: tipo.name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteTipo.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleOpenFormBuilder = (tipo: typeof tipos[0]) => {
    const formFields = (tipo as any).form_fields as FormFieldConfig[] || [];
    setSelectedTipoForBuilder({
      id: tipo.id,
      name: tipo.name,
      form_fields: formFields,
    });
    setFormBuilderOpen(true);
  };

  const getFieldCount = (tipo: typeof tipos[0]) => {
    const fields = (tipo as any).form_fields as FormFieldConfig[] | undefined;
    return fields?.length || 0;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tipos de Ativos"
          description="Configure os tipos de ativos disponíveis"
          icon={FolderKanban}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tipos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Tipo" : "Novo Tipo"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Ex: Eletrônicos, Veículos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prefix">Prefixo Patrimônio</Label>
                      <Input
                        id="prefix"
                        value={formData.prefix}
                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase().slice(0, 5) })}
                        placeholder="Ex: NTB, CEL, IMP"
                        maxLength={5}
                        className="uppercase"
                      />
                      <p className="text-xs text-muted-foreground">
                        3-5 letras para identificar o tipo no código de patrimônio
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depreciation_rate">Taxa Depreciação (%)</Label>
                      <Input
                        id="depreciation_rate"
                        type="number"
                        step="0.01"
                        value={formData.depreciation_rate}
                        onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="useful_life_months">Vida Útil (meses)</Label>
                      <Input
                        id="useful_life_months"
                        type="number"
                        value={formData.useful_life_months}
                        onChange={(e) => setFormData({ ...formData, useful_life_months: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createTipo.isPending || updateTipo.isPending}>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Campos Formulário</TableHead>
                    <TableHead>Taxa Depreciação</TableHead>
                    <TableHead>Vida Útil</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.name}</TableCell>
                      <TableCell>
                        {(tipo as any).prefix ? (
                          <Badge variant="outline" className="font-mono">
                            {(tipo as any).prefix}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{tipo.category || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getFieldCount(tipo)} campos
                        </Badge>
                      </TableCell>
                      <TableCell>{tipo.depreciation_rate ? `${tipo.depreciation_rate}%` : "-"}</TableCell>
                      <TableCell>{tipo.useful_life_months ? `${tipo.useful_life_months} meses` : "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Personalizar formulário"
                          onClick={() => handleOpenFormBuilder(tipo)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(tipo)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTipos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum tipo encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.name || ""}
        itemType="tipo de ativo"
        isLoading={deleteTipo.isPending}
      />

      {selectedTipoForBuilder && (
        <AssetFormBuilder
          open={formBuilderOpen}
          onOpenChange={setFormBuilderOpen}
          tipoId={selectedTipoForBuilder.id}
          tipoNome={selectedTipoForBuilder.name}
          currentFields={selectedTipoForBuilder.form_fields}
        />
      )}
    </AppLayout>
  );
}
