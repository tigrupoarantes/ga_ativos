import { useState } from "react";
import { useEquipes } from "@/hooks/useEquipes";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface EquipeForm {
  nome: string;
  descricao: string;
  empresa_id: string;
  lider_id: string;
}

const emptyForm: EquipeForm = {
  nome: "",
  descricao: "",
  empresa_id: "",
  lider_id: "",
};

export function EquipesInlineManager() {
  const { equipes, isLoading, createEquipe, updateEquipe, deleteEquipe } = useEquipes();
  const { empresas } = useEmpresas();
  const { funcionarios } = useFuncionarios();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [equipeToDelete, setEquipeToDelete] = useState<{ id: string; nome: string } | null>(null);
  const [form, setForm] = useState<EquipeForm>(emptyForm);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (equipe: any) => {
    setEditingId(equipe.id);
    setForm({
      nome: equipe.nome || "",
      descricao: equipe.descricao || "",
      empresa_id: equipe.empresa_id || "",
      lider_id: equipe.lider_id || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      nome: form.nome,
      descricao: form.descricao || null,
      empresa_id: form.empresa_id || null,
      lider_id: form.lider_id || null,
    };

    if (editingId) {
      await updateEquipe.mutateAsync({ id: editingId, ...payload });
    } else {
      await createEquipe.mutateAsync(payload);
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleOpenDelete = (equipe: { id: string; nome: string }) => {
    setEquipeToDelete(equipe);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (equipeToDelete) {
      await deleteEquipe.mutateAsync(equipeToDelete.id);
      setDeleteDialogOpen(false);
      setEquipeToDelete(null);
    }
  };

  const isPending = createEquipe.isPending || updateEquipe.isPending;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Equipes</CardTitle>
          </div>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Equipe
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : equipes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma equipe cadastrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipes.map((equipe) => (
                  <TableRow key={equipe.id}>
                    <TableCell className="font-medium">{equipe.nome}</TableCell>
                    <TableCell>{equipe.empresa?.nome || "-"}</TableCell>
                    <TableCell>{equipe.lider?.nome || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(equipe)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete({ id: equipe.id, nome: equipe.nome })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Equipe" : "Nova Equipe"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome da equipe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição da equipe"
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Select
                value={form.empresa_id}
                onValueChange={(value) => setForm({ ...form, empresa_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lider">Líder</Label>
              <Select
                value={form.lider_id}
                onValueChange={(value) => setForm({ ...form, lider_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um líder" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      {func.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!form.nome || isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={equipeToDelete?.nome || ""}
        itemType="equipe"
        isLoading={deleteEquipe.isPending}
      />
    </>
  );
}
