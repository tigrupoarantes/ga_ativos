import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useTiposAtivos, useAtivos } from "@/hooks/useAtivos";
import { Loader2, Info } from "lucide-react";

interface NotebookFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NotebookForm({ onSuccess, onCancel }: NotebookFormProps) {
  const { funcionarios, isLoading: loadingFuncionarios } = useFuncionarios();
  const { tipos, isLoading: loadingTipos } = useTiposAtivos();
  const { createAtivo } = useAtivos();

  const [formData, setFormData] = useState({
    marca: "",
    modelo: "",
    numero_serie: "",
    data_aquisicao: "",
    valor_aquisicao: "",
    funcionario_id: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Encontrar tipo "Notebook" automaticamente
  const tipoNotebook = tipos.find(
    (t) =>
      t.name?.toLowerCase().includes("notebook") ||
      t.category?.toLowerCase().includes("notebook")
  );

  // Funcionário selecionado para exibir CPF
  const funcionarioSelecionado = funcionarios.find(
    (f) => f.id === formData.funcionario_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createAtivo.mutateAsync({
        nome: `Notebook ${formData.marca} ${formData.modelo}`,
        marca: formData.marca,
        modelo: formData.modelo,
        numero_serie: formData.numero_serie,
        data_aquisicao: formData.data_aquisicao || null,
        valor_aquisicao: formData.valor_aquisicao
          ? parseFloat(formData.valor_aquisicao)
          : null,
        funcionario_id: formData.funcionario_id || null,
        tipo_id: tipoNotebook?.id || null,
        patrimonio: `NTB-${Date.now()}`,
        status: "em_uso",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao cadastrar notebook:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    formData.marca.trim() !== "" &&
    formData.modelo.trim() !== "" &&
    formData.numero_serie.trim() !== "" &&
    formData.data_aquisicao !== "" &&
    formData.valor_aquisicao !== "" &&
    formData.funcionario_id !== "";

  if (loadingFuncionarios || loadingTipos) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="marca">Marca *</Label>
        <Input
          id="marca"
          placeholder="Ex: Dell, Lenovo, HP..."
          value={formData.marca}
          onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modelo">Modelo *</Label>
        <Input
          id="modelo"
          placeholder="Ex: Inspiron 15, ThinkPad T14..."
          value={formData.modelo}
          onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="numero_serie">Número de Série *</Label>
        <Input
          id="numero_serie"
          placeholder="Ex: SN123456789"
          value={formData.numero_serie}
          onChange={(e) =>
            setFormData({ ...formData, numero_serie: e.target.value })
          }
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_aquisicao">Data de Aquisição *</Label>
          <Input
            id="data_aquisicao"
            type="date"
            value={formData.data_aquisicao}
            onChange={(e) =>
              setFormData({ ...formData, data_aquisicao: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor_aquisicao">Valor de Aquisição (R$) *</Label>
          <Input
            id="valor_aquisicao"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={formData.valor_aquisicao}
            onChange={(e) =>
              setFormData({ ...formData, valor_aquisicao: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="funcionario">Funcionário Responsável *</Label>
        <Select
          value={formData.funcionario_id}
          onValueChange={(value) =>
            setFormData({ ...formData, funcionario_id: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o funcionário" />
          </SelectTrigger>
          <SelectContent>
            {funcionarios.map((funcionario) => (
              <SelectItem key={funcionario.id} value={funcionario.id}>
                {funcionario.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>CPF Responsável</Label>
        <Input
          value={funcionarioSelecionado?.cpf || ""}
          disabled
          className="bg-muted"
          placeholder="Selecione um funcionário acima"
        />
      </div>

      {tipoNotebook && (
        <div className="bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Depreciação</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Taxa:</span>
              <span className="ml-2 font-medium">
                {tipoNotebook.depreciation_rate || 0}% ao ano
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Vida Útil:</span>
              <span className="ml-2 font-medium">
                {tipoNotebook.useful_life_months || 0} meses
              </span>
            </div>
          </div>
        </div>
      )}

      {!tipoNotebook && (
        <div className="bg-status-warning/10 p-4 rounded-lg border border-status-warning/20">
          <p className="text-sm text-status-warning">
            ⚠️ Tipo "Notebook" não encontrado. Cadastre-o em Tipos de Ativos para
            configurar a depreciação.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!isFormValid || isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}
