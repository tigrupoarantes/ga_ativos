import { useState } from "react";
import { useVeiculosDocumentos } from "@/hooks/useVeiculosDocumentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, ExternalLink, Trash2, FileText, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tiposDocumento = [
  "CRLV",
  "Seguro",
  "IPVA",
  "Licenciamento",
  "Laudo de Vistoria",
  "Contrato",
  "Nota Fiscal",
  "Outros",
];

interface VeiculoDocumentosSectionProps {
  veiculoPlaca: string;
}

export function VeiculoDocumentosSection({ veiculoPlaca }: VeiculoDocumentosSectionProps) {
  const { documentos, isLoading, createDocumento, deleteDocumento } = useVeiculosDocumentos(veiculoPlaca);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    tipo_documento: "",
    nome_arquivo: "",
    url: "",
  });

  const handleAddDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDocumento.mutateAsync({
      veiculo_placa: veiculoPlaca,
      ...formData,
    });
    setFormData({ tipo_documento: "", nome_arquivo: "", url: "" });
    setShowAddForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDocumento.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Documentos do Veículo</h4>
          <p className="text-sm text-muted-foreground">
            Gerencie CRLV, seguros, licenciamentos e outros documentos
          </p>
        </div>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Formulário inline para adicionar documento */}
      {showAddForm && (
        <form
          onSubmit={handleAddDocumento}
          className="space-y-4 border rounded-lg p-4 bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <h5 className="font-medium text-sm">Novo Documento</h5>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select
                value={formData.tipo_documento}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_documento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDocumento.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Arquivo *</Label>
              <Input
                value={formData.nome_arquivo}
                onChange={(e) =>
                  setFormData({ ...formData, nome_arquivo: e.target.value })
                }
                placeholder="Ex: CRLV 2024"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>URL do Documento *</Label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://..."
              type="url"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                createDocumento.isPending ||
                !formData.tipo_documento ||
                !formData.nome_arquivo ||
                !formData.url
              }
            >
              Salvar Documento
            </Button>
          </div>
        </form>
      )}

      {/* Lista de documentos existentes */}
      <div className="space-y-2">
        {documentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum documento cadastrado</p>
            <p className="text-sm">Clique em "Adicionar" para incluir documentos</p>
          </div>
        ) : (
          documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between border rounded-lg p-3 bg-background hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {doc.tipo_documento}
                    </Badge>
                    <span className="font-medium truncate">{doc.nome_arquivo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adicionado em{" "}
                    {doc.created_at
                      ? format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir documento"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Excluir documento">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o documento "{doc.nome_arquivo}"? Esta
                        ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
