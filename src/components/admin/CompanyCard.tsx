import { useState } from "react";
import { Building2, Edit, Trash2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AreaTreeView } from "./AreaTreeView";
import { AreaFormDialog } from "./AreaFormDialog";
import { ImportAreasDialog } from "./ImportAreasDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Area, useAreas } from "@/hooks/useAreas";
import { useQueryClient } from "@tanstack/react-query";

interface Empresa {
  id: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  color?: string;
  logo_url?: string;
}

interface CompanyCardProps {
  empresa: Empresa;
  onEdit: () => void;
  onDelete: () => void;
}

export function CompanyCard({ empresa, onEdit, onDelete }: CompanyCardProps) {
  const queryClient = useQueryClient();
  const { areasTree, areasFlat, createArea, updateArea, deleteArea } = useAreas(empresa.id);
  
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deleteAreaDialog, setDeleteAreaDialog] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const themeColor = empresa.color || "#0B3D91";

  const handleAddArea = () => {
    setEditingArea(null);
    setAreaDialogOpen(true);
  };

  const handleEditArea = (area: Area) => {
    setEditingArea(area);
    setAreaDialogOpen(true);
  };

  const handleDeleteAreaClick = (area: Area) => {
    setAreaToDelete(area);
    setDeleteAreaDialog(true);
  };

  const handleAreaSubmit = async (data: { name: string; cost_center: string; parent_id: string }) => {
    if (editingArea) {
      await updateArea.mutateAsync({
        id: editingArea.id,
        name: data.name,
        cost_center: data.cost_center || undefined,
        parent_id: data.parent_id || undefined,
      });
    } else {
      await createArea.mutateAsync({
        company_id: empresa.id,
        name: data.name,
        cost_center: data.cost_center || undefined,
        parent_id: data.parent_id || undefined,
      });
    }
    setAreaDialogOpen(false);
    setEditingArea(null);
  };

  const handleConfirmDeleteArea = async () => {
    if (areaToDelete) {
      await deleteArea.mutateAsync(areaToDelete.id);
      setDeleteAreaDialog(false);
      setAreaToDelete(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header com cor temática */}
        <CardHeader
          className="pb-3"
          style={{
            borderTop: `4px solid ${themeColor}`,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Ícone com cor temática */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                {empresa.logo_url ? (
                  <img
                    src={empresa.logo_url}
                    alt={empresa.nome}
                    className="h-6 w-6 object-contain"
                  />
                ) : (
                  <Building2 className="h-5 w-5" style={{ color: themeColor }} />
                )}
              </div>

              <div>
                <h3 className="font-semibold text-lg">{empresa.nome}</h3>
                {empresa.cnpj && (
                  <p className="text-sm text-muted-foreground">
                    CNPJ: {empresa.cnpj}
                  </p>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Separador */}
          <div className="border-t mb-4" />

          {/* Seção de Áreas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Áreas/Setores
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Importar
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddArea}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Nova Área
                </Button>
              </div>
            </div>

            {/* TreeView de Áreas */}
            <div className="bg-muted/30 rounded-lg p-2 min-h-[80px]">
              <AreaTreeView
                areas={areasTree}
                onEdit={handleEditArea}
                onDelete={handleDeleteAreaClick}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Área */}
      <AreaFormDialog
        open={areaDialogOpen}
        onOpenChange={(open) => {
          setAreaDialogOpen(open);
          if (!open) setEditingArea(null);
        }}
        onSubmit={handleAreaSubmit}
        companyId={empresa.id}
        areas={areasFlat}
        initialData={editingArea ? {
          id: editingArea.id,
          name: editingArea.name,
          cost_center: editingArea.cost_center || "",
          parent_id: editingArea.parent_id || "",
        } : undefined}
        isEditing={!!editingArea}
        isLoading={createArea.isPending || updateArea.isPending}
      />

      {/* Dialog de confirmação de exclusão de área */}
      <ConfirmDeleteDialog
        open={deleteAreaDialog}
        onOpenChange={setDeleteAreaDialog}
        onConfirm={handleConfirmDeleteArea}
        itemName={areaToDelete?.name || ""}
        itemType="área"
        isLoading={deleteArea.isPending}
      />

      {/* Dialog de Importação de Áreas */}
      <ImportAreasDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        companyId={empresa.id}
        companyName={empresa.nome}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["areas"] });
        }}
      />
    </>
  );
}
