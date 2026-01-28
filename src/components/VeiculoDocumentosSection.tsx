import { useState, useRef, useCallback } from "react";
import { useVeiculosDocumentos } from "@/hooks/useVeiculosDocumentos";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { Plus, ExternalLink, Trash2, FileText, X, Upload, File, Image, FileType } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tiposDocumento = [
  "CRLV",
  "Seguro",
  "Apólice de Seguro",
  "IPVA",
  "Licenciamento",
  "Laudo de Vistoria",
  "Contrato",
  "Nota Fiscal",
  "Nota Fiscal de Compra",
  "Multa",
  "Manutenção",
  "Restrição",
  "Comprovante de Pagamento",
  "Foto do Veículo",
  "Outros",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

interface VeiculoDocumentosSectionProps {
  veiculoPlaca: string;
  tipoFiltro?: string[];
}

function getFileIcon(filename: string) {
  const ext = filename.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return <Image className="h-5 w-5 text-primary" />;
  }
  if (ext === 'pdf') {
    return <FileType className="h-5 w-5 text-destructive" />;
  }
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function VeiculoDocumentosSection({ veiculoPlaca, tipoFiltro }: VeiculoDocumentosSectionProps) {
  const { documentos: allDocumentos, isLoading, createDocumento, deleteDocumento } = useVeiculosDocumentos(veiculoPlaca);
  const { uploadFile, isUploading, progress, getPathFromUrl, deleteFile } = useStorageUpload('veiculos-documentos');
  
  const documentos = tipoFiltro 
    ? allDocumentos.filter(doc => tipoFiltro.includes(doc.tipo_documento))
    : allDocumentos;

  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<"upload" | "url">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    tipo_documento: "",
    nome_arquivo: "",
    url: "",
  });

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo permitido: 10MB");
      return false;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato não suportado. Use PDF, JPG, PNG ou WEBP");
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      if (!formData.nome_arquivo) {
        setFormData(prev => ({ ...prev, nome_arquivo: file.name.replace(/\.[^/.]+$/, "") }));
      }
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const resetForm = () => {
    setFormData({ tipo_documento: "", nome_arquivo: "", url: "" });
    setSelectedFile(null);
    setUploadMode("upload");
    setShowAddForm(false);
  };

  const handleAddDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let documentUrl = formData.url;
      let fileSize: number | undefined;

      if (uploadMode === "upload" && selectedFile) {
        const timestamp = Date.now();
        const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${veiculoPlaca}/${timestamp}-${sanitizedName}`;
        
        documentUrl = await uploadFile(selectedFile, path);
        fileSize = selectedFile.size;
      }

      if (!documentUrl) {
        toast.error("Informe um arquivo ou URL");
        return;
      }

      await createDocumento.mutateAsync({
        veiculo_placa: veiculoPlaca,
        tipo_documento: formData.tipo_documento,
        nome_arquivo: formData.nome_arquivo,
        url: documentUrl,
        tamanho_bytes: fileSize,
      });

      resetForm();
    } catch (error) {
      console.error("Erro ao adicionar documento:", error);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    try {
      // Try to delete from storage if it's a storage URL
      const path = getPathFromUrl(url);
      if (path) {
        try {
          await deleteFile(path);
        } catch (err) {
          console.warn("Arquivo não encontrado no storage:", err);
        }
      }
      await deleteDocumento.mutateAsync(id);
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            Anexe apólices, multas, notas fiscais e outros documentos
          </p>
        </div>
        {!showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Formulário de Upload */}
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
              onClick={resetForm}
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
                placeholder="Ex: Apólice 2025"
                required
              />
            </div>
          </div>

          {/* Modo de Upload */}
          <div className="space-y-3">
            <Label>Origem do Documento</Label>
            <RadioGroup
              value={uploadMode}
              onValueChange={(v) => setUploadMode(v as "upload" | "url")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload" />
                <Label htmlFor="upload" className="font-normal cursor-pointer">
                  Fazer upload de arquivo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="url" id="url" />
                <Label htmlFor="url" className="font-normal cursor-pointer">
                  Informar URL externa
                </Label>
              </div>
            </RadioGroup>
          </div>

          {uploadMode === "upload" ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragging 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50",
                  selectedFile && "border-accent bg-accent/10"
                )}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(selectedFile.name)}
                    <div className="text-left">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Clique para selecionar ou arraste aqui
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG ou WEBP (máx. 10MB)
                    </p>
                  </>
                )}
              </div>

              {isUploading && progress && (
                <div className="space-y-1">
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Enviando... {progress.percentage}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>URL do Documento *</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isUploading ||
                createDocumento.isPending ||
                !formData.tipo_documento ||
                !formData.nome_arquivo ||
                (uploadMode === "upload" ? !selectedFile : !formData.url)
              }
            >
              {isUploading ? "Enviando..." : "Salvar Documento"}
            </Button>
          </div>
        </form>
      )}

      {/* Lista de documentos */}
      <div className="space-y-2">
        {documentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum documento cadastrado</p>
            <p className="text-sm">Clique em "Adicionar" para anexar documentos</p>
          </div>
        ) : (
          documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between border rounded-lg p-3 bg-background hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {getFileIcon(doc.nome_arquivo)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {doc.tipo_documento}
                    </Badge>
                    <span className="font-medium truncate">{doc.nome_arquivo}</span>
                    {doc.tamanho_bytes && (
                      <span className="text-xs text-muted-foreground">
                        ({formatFileSize(doc.tamanho_bytes)})
                      </span>
                    )}
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
                      <AlertDialogAction onClick={() => handleDelete(doc.id, doc.url)}>
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
