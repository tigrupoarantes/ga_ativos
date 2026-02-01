import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useEmpresas } from "@/hooks/useEmpresas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Search } from "lucide-react";
import { CompanyCard } from "@/components/admin/CompanyCard";
import { CompanyFormDialog } from "@/components/admin/CompanyFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

export default function EstruturaOrganizacional() {
  const { empresas, isLoading, createEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  
  const [search, setSearch] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<typeof empresas[0] | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<typeof empresas[0] | null>(null);

  const filteredEmpresas = empresas.filter(
    (e) =>
      e.nome?.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCompany = () => {
    setEditingCompany(null);
    setCompanyDialogOpen(true);
  };

  const handleEditCompany = (empresa: typeof empresas[0]) => {
    setEditingCompany(empresa);
    setCompanyDialogOpen(true);
  };

  const handleDeleteCompanyClick = (empresa: typeof empresas[0]) => {
    setCompanyToDelete(empresa);
    setDeleteDialogOpen(true);
  };

  const handleCompanySubmit = async (data: {
    nome: string;
    razao_social: string;
    cnpj: string;
    endereco: string;
    telefone: string;
    email: string;
    logo_url: string;
    color: string;
    is_auditable: boolean;
  }) => {
    if (editingCompany) {
      await updateEmpresa.mutateAsync({
        id: editingCompany.id,
        nome: data.nome,
        razao_social: data.razao_social || undefined,
        cnpj: data.cnpj || undefined,
        endereco: data.endereco || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        logo_url: data.logo_url || undefined,
        color: data.color || undefined,
        is_auditable: data.is_auditable,
      });
    } else {
      await createEmpresa.mutateAsync({
        nome: data.nome,
        razao_social: data.razao_social || undefined,
        cnpj: data.cnpj || undefined,
        endereco: data.endereco || undefined,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        logo_url: data.logo_url || undefined,
        color: data.color || undefined,
        is_auditable: data.is_auditable,
      });
    }
    setCompanyDialogOpen(false);
    setEditingCompany(null);
  };

  const handleConfirmDeleteCompany = async () => {
    if (companyToDelete) {
      await deleteEmpresa.mutateAsync(companyToDelete.id);
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Estrutura Organizacional"
          description="Gerencie empresas e áreas do Grupo"
          icon={Building2}
        />

        {/* Barra de ações */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>
          <Button onClick={handleAddCompany}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        {/* Grid de Cards */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : filteredEmpresas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma empresa encontrada</p>
            <p className="text-sm">
              {search ? "Tente outra busca" : "Clique em 'Nova Empresa' para começar"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmpresas.map((empresa) => (
              <CompanyCard
                key={empresa.id}
                empresa={empresa}
                onEdit={() => handleEditCompany(empresa)}
                onDelete={() => handleDeleteCompanyClick(empresa)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de Empresa */}
      <CompanyFormDialog
        open={companyDialogOpen}
        onOpenChange={(open) => {
          setCompanyDialogOpen(open);
          if (!open) setEditingCompany(null);
        }}
        onSubmit={handleCompanySubmit}
        initialData={editingCompany ? {
          nome: editingCompany.nome || "",
          razao_social: editingCompany.razao_social || "",
          cnpj: editingCompany.cnpj || "",
          endereco: editingCompany.endereco || "",
          telefone: editingCompany.telefone || "",
          email: editingCompany.email || "",
          logo_url: (editingCompany as any).logo_url || "",
          color: (editingCompany as any).color || "#0B3D91",
          is_auditable: (editingCompany as any).is_auditable || false,
        } : undefined}
        isEditing={!!editingCompany}
        isLoading={createEmpresa.isPending || updateEmpresa.isPending}
      />

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDeleteCompany}
        itemName={companyToDelete?.nome || ""}
        itemType="empresa"
        isLoading={deleteEmpresa.isPending}
      />
    </AppLayout>
  );
}
