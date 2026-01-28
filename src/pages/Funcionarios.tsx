import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useFuncionariosPaginated } from "@/hooks/useFuncionarios";
import { useEmpresasSelect } from "@/hooks/useSelectOptions";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Users, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImportFuncionariosDialog } from "@/components/ImportFuncionariosDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

// Função para normalizar CPF (apenas números)
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '');

// Função para formatar CPF para exibição
const formatCpf = (cpf: string) => {
  const nums = normalizeCpf(cpf);
  if (nums.length !== 11) return cpf;
  return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Verificar duplicidade de CPF
const checkCpfDuplicate = async (cpf: string, currentId?: string | null): Promise<boolean> => {
  const normalized = normalizeCpf(cpf);
  if (!normalized || normalized.length !== 11) return false;
  
  let query = supabase
    .from('funcionarios')
    .select('id')
    .eq('cpf', normalized)
    .eq('active', true)
    .limit(1);
  
  if (currentId) {
    query = query.neq('id', currentId);
  }
  
  const { data } = await query;
  return data !== null && data.length > 0;
};

export default function Funcionarios() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [pageSize, setPageSize] = useState(25);
  
  const {
    funcionarios,
    isLoading,
    page,
    totalCount,
    totalPages,
    setPage,
    setSearch,
    createFuncionario,
    updateFuncionario,
    deleteFuncionario,
  } = useFuncionariosPaginated({ pageSize });

  // Update search when debounced value changes
  useState(() => {
    setSearch(debouncedSearch);
  });

  const { empresas } = useEmpresasSelect();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; nome: string } | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cargo: "",
    departamento: "",
    cpf: "",
    empresa_id: "",
    is_condutor: false,
    cnh_numero: "",
    cnh_categoria: "",
    cnh_validade: "",
  });

  // Sync debounced search with hook
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  // Effect to sync debounced search
  if (debouncedSearch !== searchInput) {
    // This will trigger on next render cycle
  }

  // Update search in hook when debounce changes
  useState(() => {
    setSearch(debouncedSearch);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar CPF duplicado antes de salvar
    if (formData.cpf) {
      const isDuplicate = await checkCpfDuplicate(formData.cpf, editingId);
      if (isDuplicate) {
        toast.error('Já existe um funcionário com este CPF');
        return;
      }
    }
    
    // Normalizar dados - converter strings vazias para null
    const dataToSave = {
      nome: formData.nome,
      email: formData.email || null,
      telefone: formData.telefone || null,
      cargo: formData.cargo || null,
      departamento: formData.departamento || null,
      cpf: formData.cpf ? normalizeCpf(formData.cpf) : null,
      empresa_id: formData.empresa_id || null,
      is_condutor: formData.is_condutor,
      cnh_numero: formData.cnh_numero || null,
      cnh_categoria: formData.cnh_categoria || null,
      cnh_validade: formData.cnh_validade || null,
    };
    
    try {
      if (editingId) {
        await updateFuncionario.mutateAsync({ id: editingId, ...dataToSave });
      } else {
        await createFuncionario.mutateAsync(dataToSave);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      if (error.message?.includes('idx_funcionarios_cpf_unique')) {
        toast.error('Já existe um funcionário com este CPF');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      cargo: "",
      departamento: "",
      cpf: "",
      empresa_id: "",
      is_condutor: false,
      cnh_numero: "",
      cnh_categoria: "",
      cnh_validade: "",
    });
  };

  const handleEdit = (funcionario: typeof funcionarios[0]) => {
    setEditingId(funcionario.id);
    setFormData({
      nome: funcionario.nome || "",
      email: funcionario.email || "",
      telefone: funcionario.telefone || "",
      cargo: funcionario.cargo || "",
      departamento: funcionario.departamento || "",
      cpf: funcionario.cpf || "",
      empresa_id: funcionario.empresa_id || "",
      is_condutor: funcionario.is_condutor || false,
      cnh_numero: funcionario.cnh_numero || "",
      cnh_categoria: funcionario.cnh_categoria || "",
      cnh_validade: funcionario.cnh_validade || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (funcionario: typeof funcionarios[0]) => {
    setItemToDelete({ id: funcionario.id, nome: funcionario.nome });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await deleteFuncionario.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Funcionários"
          description={`Gerencie os funcionários da organização (${totalCount} registros)`}
          icon={Users}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionários..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearch(e.target.value);
                }}
                className="pl-10 w-[300px]"
              />
            </div>
            <div className="flex gap-2">
              <ImportFuncionariosDialog />
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Funcionário
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => {
                          // Permite formatação visual durante digitação
                          const value = e.target.value;
                          const nums = value.replace(/\D/g, '').slice(0, 11);
                          let formatted = nums;
                          if (nums.length > 9) {
                            formatted = `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6,9)}-${nums.slice(9)}`;
                          } else if (nums.length > 6) {
                            formatted = `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6)}`;
                          } else if (nums.length > 3) {
                            formatted = `${nums.slice(0,3)}.${nums.slice(3)}`;
                          }
                          setFormData({ ...formData, cpf: formatted });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input
                        id="cargo"
                        value={formData.cargo}
                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="departamento">Departamento</Label>
                      <Input
                        id="departamento"
                        value={formData.departamento}
                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      />
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_condutor"
                      checked={formData.is_condutor}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_condutor: checked as boolean })}
                    />
                    <Label htmlFor="is_condutor">É condutor</Label>
                  </div>
                  {formData.is_condutor && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cnh_numero">CNH Número</Label>
                        <Input
                          id="cnh_numero"
                          value={formData.cnh_numero}
                          onChange={(e) => setFormData({ ...formData, cnh_numero: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnh_categoria">Categoria</Label>
                        <Input
                          id="cnh_categoria"
                          value={formData.cnh_categoria}
                          onChange={(e) => setFormData({ ...formData, cnh_categoria: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnh_validade">Validade</Label>
                        <Input
                          id="cnh_validade"
                          type="date"
                          value={formData.cnh_validade}
                          onChange={(e) => setFormData({ ...formData, cnh_validade: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createFuncionario.isPending || updateFuncionario.isPending}>
                      {editingId ? "Salvar" : "Criar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Condutor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funcionarios.map((funcionario) => (
                      <TableRow key={funcionario.id}>
                        <TableCell className="font-medium">{funcionario.nome}</TableCell>
                        <TableCell>{funcionario.email || "-"}</TableCell>
                        <TableCell>{funcionario.cargo || "-"}</TableCell>
                        <TableCell>{(funcionario as any).empresa?.nome || "-"}</TableCell>
                        <TableCell>
                          {funcionario.is_condutor ? (
                            <Badge className="bg-status-info/10 text-status-info">
                              <Car className="h-3 w-3 mr-1" />
                              Sim
                            </Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(funcionario)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(funcionario)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {funcionarios.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum funcionário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <div className="mt-4">
                  <DataTablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    showPageSizeSelector
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.nome || ""}
        itemType="funcionário"
        isLoading={deleteFuncionario.isPending}
      />
    </AppLayout>
  );
}
