import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { useFuncionariosCombobox } from "@/hooks/useSelectOptions";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAtivos } from "@/hooks/useAtivos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export interface FormFieldConfig {
  field: string;
  required: boolean;
  label: string;
}

interface DynamicAssetFormProps {
  tipoId: string;
  tipoNome: string;
  formFields: FormFieldConfig[];
  onSuccess: () => void;
  onCancel: () => void;
}

// Campos disponíveis e seus tipos
const FIELD_TYPES: Record<string, "text" | "textarea" | "date" | "number" | "funcionario" | "empresa"> = {
  nome: "text",
  marca: "text",
  modelo: "text",
  numero_serie: "text",
  imei: "text",
  chip_linha: "text",
  descricao: "textarea",
  data_aquisicao: "date",
  valor_aquisicao: "number",
  funcionario_id: "funcionario",
  empresa_id: "empresa",
};

// Campos padrão caso não haja configuração
const DEFAULT_FIELDS: FormFieldConfig[] = [
  { field: "nome", required: true, label: "Nome" },
  { field: "marca", required: false, label: "Marca" },
  { field: "modelo", required: false, label: "Modelo" },
  { field: "numero_serie", required: false, label: "Número de Série" },
  { field: "imei", required: false, label: "IMEI" },
  { field: "descricao", required: false, label: "Descrição" },
  { field: "data_aquisicao", required: false, label: "Data de Aquisição" },
  { field: "valor_aquisicao", required: false, label: "Valor de Aquisição" },
  { field: "funcionario_id", required: false, label: "Funcionário Responsável" },
  { field: "empresa_id", required: false, label: "Empresa" },
];

export function DynamicAssetForm({ tipoId, tipoNome, formFields, onSuccess, onCancel }: DynamicAssetFormProps) {
  const { funcionarios } = useFuncionariosCombobox();
  const { empresas } = useEmpresas();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Usar campos padrão se não houver configuração
  const fields = formFields && formFields.length > 0 ? formFields : DEFAULT_FIELDS;

  // Estado do formulário
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      initial[f.field] = "";
    });
    return initial;
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Proteção contra duplo clique
    if (isSubmitting) return;
    
    // Validar campos obrigatórios
    for (const field of fields) {
      if (field.required && !formData[field.field]) {
        toast.error(`Campo "${field.label}" é obrigatório`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Determinar status baseado no funcionário
      const status = formData.funcionario_id ? "em_uso" : "disponivel";
      
      // Gerar nome automático se não preenchido
      const nome = formData.nome || `${tipoNome} ${formData.marca || ""} ${formData.modelo || ""}`.trim();

      // Usar função RPC atômica que gera patrimônio e insere em uma única operação
      const { data, error } = await supabase.rpc('create_asset_with_patrimonio', {
        p_tipo_id: tipoId,
        p_nome: nome,
        p_marca: formData.marca || null,
        p_modelo: formData.modelo || null,
        p_numero_serie: formData.numero_serie || null,
        p_imei: formData.imei || null,
        p_chip_linha: formData.chip_linha || null,
        p_descricao: formData.descricao || null,
        p_data_aquisicao: formData.data_aquisicao || null,
        p_valor_aquisicao: formData.valor_aquisicao ? parseFloat(formData.valor_aquisicao) : null,
        p_funcionario_id: formData.funcionario_id || null,
        p_empresa_id: formData.empresa_id || null,
        p_status: status,
      });

      if (error) throw error;

      toast.success("Ativo criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ativos"] });
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao criar ativo:", error);
      toast.error("Erro ao criar ativo: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (config: FormFieldConfig) => {
    const fieldType = FIELD_TYPES[config.field] || "text";

    switch (fieldType) {
      case "textarea":
        return (
          <div key={config.field} className="space-y-2 col-span-2">
            <Label htmlFor={config.field}>
              {config.label} {config.required && "*"}
            </Label>
            <Textarea
              id={config.field}
              value={formData[config.field] || ""}
              onChange={(e) => handleChange(config.field, e.target.value)}
              placeholder={`Digite ${config.label.toLowerCase()}`}
            />
          </div>
        );

      case "date":
        return (
          <div key={config.field} className="space-y-2">
            <Label htmlFor={config.field}>
              {config.label} {config.required && "*"}
            </Label>
            <Input
              id={config.field}
              type="date"
              value={formData[config.field] || ""}
              onChange={(e) => handleChange(config.field, e.target.value)}
            />
          </div>
        );

      case "number":
        return (
          <div key={config.field} className="space-y-2">
            <Label htmlFor={config.field}>
              {config.label} {config.required && "*"}
            </Label>
            <Input
              id={config.field}
              type="number"
              step="0.01"
              value={formData[config.field] || ""}
              onChange={(e) => handleChange(config.field, e.target.value)}
              placeholder="0,00"
            />
          </div>
        );

      case "funcionario":
        return (
          <div key={config.field} className="space-y-2">
            <Label htmlFor={config.field}>
              {config.label} {config.required && "*"}
            </Label>
            <FuncionarioCombobox
              value={formData[config.field] || ""}
              onValueChange={(v) => handleChange(config.field, v)}
              funcionarios={funcionarios}
              placeholder="Buscar por nome ou CPF"
            />
          </div>
        );

      case "empresa":
        return (
          <div key={config.field} className="space-y-2">
            <Label htmlFor={config.field}>
              {config.label} {config.required && "*"}
            </Label>
            <Select
              value={formData[config.field] || ""}
              onValueChange={(v) => handleChange(config.field, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <div key={config.field} className="space-y-2">
            <Label htmlFor={config.field}>
              {config.label} {config.required && "*"}
            </Label>
            <Input
              id={config.field}
              value={formData[config.field] || ""}
              onChange={(e) => handleChange(config.field, e.target.value)}
              placeholder={`Digite ${config.label.toLowerCase()}`}
            />
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map(renderField)}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Voltar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Criar Ativo
        </Button>
      </DialogFooter>
    </form>
  );
}
