import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { useLinhasTelefonicas } from "@/hooks/useLinhasTelefonicas";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { ImportLinhasDialog } from "@/components/ImportLinhasDialog";
import { SincronizarLinhasDialog } from "@/components/telefonia/SincronizarLinhasDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { DataTablePagination } from "@/components/DataTablePagination";

const OPERADORAS = ["Vivo", "Claro", "TIM", "Oi", "Outras"];

interface FormData {
  numero: string;
  funcionario_id: string;
  operadora: string;
  plano: string;
  observacoes: string;
}

const initialFormData: FormData = {
  numero: "",
  funcionario_id: "",
  operadora: "",
  plano: "",
  observacoes: "",
};

export default function LinhasTelefonicas() {
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [operadoraFilter, setOperadoraFilter] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; numero: string } | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const { linhas, total, isLoading, createLinha, updateLinha, deleteLinha, bulkCreateLinhas, stats } =
    useLinhasTelefonicas(debouncedSearch, page, operadoraFilter || undefined);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Carrega funcionários APENAS quando o dialog de criação/edição abre
  // Usa query mínima (id, nome, cpf) em vez de SELECT * com JOINs de empresa/equipe
  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios", "combobox"],
    enabled: dialogOpen,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf")
        .eq("active", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      numero: formData.numero.replace(/\D/g, ""),
      funcionario_id: formData.funcionario_id || null,
      operadora: formData.operadora || null,
      plano: formData.plano || null,
      observacoes: formData.observacoes || null,
    };

    if (editingId) {
      updateLinha.mutate({ id: editingId, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      });
    } else {
      createLinha.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        },
      });
    }
  };

  const handleEdit = (linha: any) => {
    setFormData({
      numero: linha.numero,
      funcionario_id: linha.funcionario_id || "",
      operadora: linha.operadora || "",
      plano: linha.plano || "",
      observacoes: linha.observacoes || "",
    });
    setEditingId(linha.id);
    setDialogOpen(true);
  };

  const handleDeleteClick = (linha: any) => {
    setItemToDelete({ id: linha.id, numero: linha.numero });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      deleteLinha.mutate(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleImportComplete = (linhasData: any[]) => {
    bulkCreateLinhas.mutate(linhasData);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Linhas Telefônicas"
          description="Gerencie as linhas telefônicas e suas atribuições"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSyncOpen(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar com Claro
              </Button>
              <ImportLinhasDialog onImportComplete={handleImportComplete} />
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Linha
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingId ? "Editar Linha" : "Nova Linha Telefônica"}
                    </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número da Linha *</Label>
                  <Input
                    id="numero"
                    placeholder="(11) 99999-9999"
                    value={formData.numero}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, numero: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Funcionário Responsável</Label>
                  <FuncionarioCombobox
                    value={formData.funcionario_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, funcionario_id: value }))
                    }
                    funcionarios={funcionarios || []}
                    placeholder="Selecione o funcionário (opcional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Operadora</Label>
                    <Select
                      value={formData.operadora}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, operadora: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERADORAS.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plano">Plano</Label>
                    <Input
                      id="plano"
                      placeholder="Ex: Corporativo 50GB"
                      value={formData.plano}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, plano: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações adicionais..."
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                    }
                  />
                </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createLinha.isPending || updateLinha.isPending}>
                      {editingId ? "Salvar" : "Cadastrar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Linhas</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atribuídas</p>
                  <p className="text-2xl font-bold">{stats.atribuidas}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disponíveis</p>
                  <p className="text-2xl font-bold">{stats.disponiveis}</p>
                </div>
                <UserX className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome e/ou número da linha..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <Select value={operadoraFilter} onValueChange={(v) => { setOperadoraFilter(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todas operadoras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas operadoras</SelectItem>
              {OPERADORAS.map((op) => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? `${total} resultado${total !== 1 ? "s" : ""} para "${debouncedSearch}"`
                : `${total} linha${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Operadora</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : linhas?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma linha telefônica cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                linhas?.map((linha) => (
                  <TableRow key={linha.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-medium">
                      {formatPhone(linha.numero)}
                    </TableCell>
                    <TableCell>
                      {linha.funcionario ? (
                        <div>
                          <span>{linha.funcionario.nome}</span>
                          {linha.funcionario.cpf && (
                            <span className="text-xs text-muted-foreground block">
                              CPF: {linha.funcionario.cpf}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{linha.operadora || "-"}</TableCell>
                    <TableCell>{linha.plano || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(linha)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar linha</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(linha)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir linha</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      <SincronizarLinhasDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        onSyncComplete={() => {}}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.numero || ""}
        itemType="linha telefônica"
        isLoading={deleteLinha.isPending}
      />
    </AppLayout>
  );
}
