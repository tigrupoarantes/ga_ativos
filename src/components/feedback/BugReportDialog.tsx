import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBugReports } from "@/hooks/useBugReports";
import { Bug, Lightbulb } from "lucide-react";

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportDialog({ open, onOpenChange }: BugReportDialogProps) {
  const location = useLocation();
  const { createReport } = useBugReports();

  const [type, setType] = useState<"bug" | "melhoria">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta" | "critica">("media");

  const resetForm = () => {
    setType("bug");
    setTitle("");
    setDescription("");
    setPriority("media");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createReport.mutateAsync({
      type,
      title,
      description,
      priority,
      page_url: location.pathname,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "bug" ? <Bug className="h-5 w-5 text-destructive" /> : <Lightbulb className="h-5 w-5 text-yellow-500" />}
            Reportar {type === "bug" ? "Bug" : "Melhoria"}
          </DialogTitle>
          <DialogDescription>
            Descreva o problema ou sugestão de melhoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="melhoria">💡 Melhoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do problema ou sugestão"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva em detalhes..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createReport.isPending}>
              {createReport.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
