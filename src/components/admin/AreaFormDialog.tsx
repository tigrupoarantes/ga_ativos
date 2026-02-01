import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Area, getDescendantIds } from "@/hooks/useAreas";

interface AreaFormData {
  name: string;
  cost_center: string;
  parent_id: string;
}

interface AreaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AreaFormData) => Promise<void>;
  companyId: string;
  areas: Area[];
  initialData?: Partial<AreaFormData> & { id?: string };
  isEditing?: boolean;
  isLoading?: boolean;
}

const defaultFormData: AreaFormData = {
  name: "",
  cost_center: "",
  parent_id: "",
};

export function AreaFormDialog({
  open,
  onOpenChange,
  onSubmit,
  companyId,
  areas,
  initialData,
  isEditing = false,
  isLoading = false,
}: AreaFormDialogProps) {
  const [formData, setFormData] = useState<AreaFormData>(defaultFormData);

  useEffect(() => {
    if (open) {
      setFormData({
        ...defaultFormData,
        name: initialData?.name || "",
        cost_center: initialData?.cost_center || "",
        parent_id: initialData?.parent_id || "",
      });
    }
  }, [open, initialData]);

  // Filtrar áreas disponíveis para parent (excluir a própria e descendentes)
  const availableParentAreas = useMemo(() => {
    if (!isEditing || !initialData?.id) {
      return areas;
    }

    const editingId = initialData.id;
    const descendantIds = getDescendantIds(editingId, areas);
    const excludeIds = new Set([editingId, ...descendantIds]);

    return areas.filter((area) => !excludeIds.has(area.id));
  }, [areas, isEditing, initialData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Área" : "Nova Área"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Área *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Marketing, Vendas, TI"
              required
              minLength={2}
            />
            <p className="text-xs text-muted-foreground">
              Nome deve ter no mínimo 2 caracteres
            </p>
          </div>

          {/* Centro de Custo */}
          <div className="space-y-2">
            <Label htmlFor="cost_center">Centro de Custo</Label>
            <Input
              id="cost_center"
              value={formData.cost_center}
              onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
              placeholder="Ex: 1001, CC-VENDAS"
            />
            <p className="text-xs text-muted-foreground">
              Código conforme cadastrado no ERP
            </p>
          </div>

          {/* Área Superior */}
          <div className="space-y-2">
            <Label htmlFor="parent_id">Área Superior (opcional)</Label>
            <Select
              value={formData.parent_id || "none"}
              onValueChange={(v) =>
                setFormData({ ...formData, parent_id: v === "none" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma (área raiz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (área raiz)</SelectItem>
                {availableParentAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                    {area.cost_center && ` (${area.cost_center})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Defina uma hierarquia organizando áreas
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
