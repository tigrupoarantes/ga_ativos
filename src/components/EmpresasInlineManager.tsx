import { useState } from "react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface EmpresaForm {
  nome: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
}

const emptyForm: EmpresaForm = {
  nome: "",
  razao_social: "",
  cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
};

export function EmpresasInlineManager() {
  const { empresas, isLoading, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [empresaToDelete, setEmpresaToDelete] = useState<{ id: string; nome: string } | null>(null);
  const [form, setForm] = useState<EmpresaForm>(emptyForm);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (empresa: any) => {
    setEditingId(empresa.id);
    setForm({
      nome: empresa.nome || "",
      razao_social: empresa.razao_social || "",
      cnpj: empresa.cnpj || "",
      email: empresa.email || "",
      telefone: empresa.telefone || "",
      endereco: empresa.endereco || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      await updateEmpresa.mutateAsync({ id: editingId, ...form });
    } else {
      await createEmpresa.mutateAsync(form);
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleOpenDelete = (empresa: { id: string; nome: string }) => {
    setEmpresaToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (empresaToDelete) {
      await deleteEmpresa.mutateAsync(empresaToDelete.id);
      setDeleteDialogOpen(false);
      setEmpresaToDelete(null);
    }
  };

  const isPending = createEmpresa.isPending || updateEmpresa.isPending;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Empresas</CardTitle>
          </div>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Empresa
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : empresas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma empresa cadastrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((empresa) => (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium">{empresa.nome}</TableCell>
                    <TableCell>{empresa.cnpj || "-"}</TableCell>
                    <TableCell>{empresa.email || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(empresa)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete({ id: empresa.id, nome: empresa.nome })}
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
              {editingId ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome fantasia"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input
                id="razao_social"
                value={form.razao_social}
                onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                placeholder="Razão social completa"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(00) 0000-0000"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                placeholder="Endereço completo"
              />
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
        itemName={empresaToDelete?.nome || ""}
        itemType="empresa"
        isLoading={deleteEmpresa.isPending}
      />
    </>
  );
}
