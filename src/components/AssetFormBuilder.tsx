import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, GripVertical, Check } from "lucide-react";
import { useTiposAtivos } from "@/hooks/useAtivos";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export interface FormFieldConfig {
  field: string;
  required: boolean;
  label: string;
}

interface AssetFormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoId: string;
  tipoNome: string;
  currentFields: FormFieldConfig[];
}

// Todos os campos disponíveis para configuração
const AVAILABLE_FIELDS: { field: string; defaultLabel: string; description: string }[] = [
  { field: "nome", defaultLabel: "Nome", description: "Nome do ativo" },
  { field: "marca", defaultLabel: "Marca", description: "Fabricante do ativo" },
  { field: "modelo", defaultLabel: "Modelo", description: "Modelo do equipamento" },
  { field: "numero_serie", defaultLabel: "Número de Série", description: "Serial number" },
  { field: "imei", defaultLabel: "IMEI", description: "Identificador de celulares" },
  { field: "chip_linha", defaultLabel: "Linha/Chip", description: "Número da linha telefônica" },
  { field: "descricao", defaultLabel: "Descrição", description: "Descrição detalhada" },
  { field: "data_aquisicao", defaultLabel: "Data de Aquisição", description: "Quando foi comprado" },
  { field: "valor_aquisicao", defaultLabel: "Valor de Aquisição", description: "Preço de compra" },
  { field: "funcionario_id", defaultLabel: "Funcionário Responsável", description: "Quem está usando" },
  { field: "empresa_id", defaultLabel: "Empresa", description: "Empresa proprietária" },
];

export function AssetFormBuilder({
  open,
  onOpenChange,
  tipoId,
  tipoNome,
  currentFields,
}: AssetFormBuilderProps) {
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar com campos atuais ou padrão
  useEffect(() => {
    if (currentFields && currentFields.length > 0) {
      setFields(currentFields);
    } else {
      // Campos padrão mínimos
      setFields([
        { field: "marca", required: false, label: "Marca" },
        { field: "modelo", required: true, label: "Modelo" },
        { field: "funcionario_id", required: false, label: "Funcionário Responsável" },
      ]);
    }
  }, [currentFields, open]);

  const isFieldActive = (fieldName: string) => {
    return fields.some((f) => f.field === fieldName);
  };

  const isFieldRequired = (fieldName: string) => {
    return fields.find((f) => f.field === fieldName)?.required ?? false;
  };

  const getFieldLabel = (fieldName: string) => {
    const existing = fields.find((f) => f.field === fieldName);
    if (existing) return existing.label;
    return AVAILABLE_FIELDS.find((f) => f.field === fieldName)?.defaultLabel || fieldName;
  };

  const toggleField = (fieldName: string) => {
    if (isFieldActive(fieldName)) {
      setFields((prev) => prev.filter((f) => f.field !== fieldName));
    } else {
      const defaultLabel = AVAILABLE_FIELDS.find((f) => f.field === fieldName)?.defaultLabel || fieldName;
      setFields((prev) => [...prev, { field: fieldName, required: false, label: defaultLabel }]);
    }
  };

  const toggleRequired = (fieldName: string) => {
    setFields((prev) =>
      prev.map((f) => (f.field === fieldName ? { ...f, required: !f.required } : f))
    );
  };

  const updateLabel = (fieldName: string, label: string) => {
    setFields((prev) =>
      prev.map((f) => (f.field === fieldName ? { ...f, label } : f))
    );
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      toast.error("Selecione pelo menos um campo para o formulário");
      return;
    }

    setIsSaving(true);
    try {
      // Converter para JSON explicitamente para satisfazer o tipo
      const fieldsJson = JSON.parse(JSON.stringify(fields));
      const { error } = await supabase
        .from("asset_types")
        .update({ form_fields: fieldsJson })
        .eq("id", tipoId);

      if (error) throw error;

      toast.success("Formulário configurado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["tipos-ativos"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Formulário: {tipoNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione os campos que aparecerão no formulário de cadastro deste tipo de ativo.
            O patrimônio é gerado automaticamente e não pode ser editado.
          </p>

          <div className="space-y-3">
            {AVAILABLE_FIELDS.map((availableField) => {
              const active = isFieldActive(availableField.field);
              const required = isFieldRequired(availableField.field);

              return (
                <Card
                  key={availableField.field}
                  className={`transition-colors ${active ? "border-primary bg-primary/5" : "border-muted"}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id={`field-${availableField.field}`}
                        checked={active}
                        onCheckedChange={() => toggleField(availableField.field)}
                      />
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`field-${availableField.field}`}
                            className="font-medium cursor-pointer"
                          >
                            {availableField.defaultLabel}
                          </Label>
                          {active && required && (
                            <Badge variant="secondary" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {availableField.description}
                        </p>
                      </div>

                      {active && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`required-${availableField.field}`}
                              checked={required}
                              onCheckedChange={() => toggleRequired(availableField.field)}
                            />
                            <Label
                              htmlFor={`required-${availableField.field}`}
                              className="text-xs cursor-pointer"
                            >
                              Obrigatório
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>

                    {active && (
                      <div className="mt-3 pl-8">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Label:</Label>
                          <Input
                            value={getFieldLabel(availableField.field)}
                            onChange={(e) => updateLabel(availableField.field, e.target.value)}
                            className="h-8 text-sm max-w-[200px]"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {fields.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Campos ativos ({fields.length}):</p>
              <div className="flex flex-wrap gap-2">
                {fields.map((f) => (
                  <Badge key={f.field} variant={f.required ? "default" : "outline"}>
                    {f.label}
                    {f.required && " *"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
