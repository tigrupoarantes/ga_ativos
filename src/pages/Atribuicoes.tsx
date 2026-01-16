import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeftRight,
  Plus,
  RotateCcw,
  Search,
  Package,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAtribuicoes } from "@/hooks/useAtribuicoes";
import { useAtivos } from "@/hooks/useAtivos";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  Ativo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Devolvido: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function Atribuicoes() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false);
  const [devolverDialogOpen, setDevolverDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>("");
  const [selectedAtivos, setSelectedAtivos] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState("");

  const { atribuicoes, isLoading, createAtribuicao, devolverAtivo } = useAtribuicoes();
  const { ativos } = useAtivos();
  const { funcionarios } = useFuncionarios();

  // Filtrar ativos disponíveis (status = Disponível e não atribuídos ativamente)
  const ativosDisponiveis = ativos.filter(
    (ativo) => ativo.status === "Disponível"
  );

  // Filtrar atribuições ativas para devolução
  const atribuicoesAtivas = atribuicoes.filter(
    (attr) => attr.status === "Ativo"
  );

  // Atribuições do funcionário selecionado (para devolução)
  const atribuicoesFuncionario = atribuicoesAtivas.filter(
    (attr) => attr.funcionario_id === selectedFuncionario
  );

  // Filtrar atribuições pela busca
  const filteredAtribuicoes = atribuicoes.filter((attr) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      attr.ativo?.nome?.toLowerCase().includes(searchLower) ||
      attr.ativo?.patrimonio?.toLowerCase().includes(searchLower) ||
      attr.funcionario?.nome?.toLowerCase().includes(searchLower) ||
      attr.status?.toLowerCase().includes(searchLower)
    );
  });

  const handleAtribuir = async () => {
    if (!selectedFuncionario || selectedAtivos.length === 0) {
      toast.error("Selecione um funcionário e pelo menos um ativo");
      return;
    }

    try {
      for (const ativoId of selectedAtivos) {
        await createAtribuicao.mutateAsync({
          ativo_id: ativoId,
          funcionario_id: selectedFuncionario,
          data_atribuicao: new Date().toISOString(),
          status: "Ativo",
          usuario_operacao: user?.email || null,
          observacoes: observacoes || null,
        });
      }
      
      resetAtribuirForm();
      setAtribuirDialogOpen(false);
    } catch (error) {
      console.error("Erro ao atribuir:", error);
    }
  };

  const handleDevolver = async () => {
    if (selectedAtivos.length === 0) {
      toast.error("Selecione pelo menos um ativo para devolver");
      return;
    }

    try {
      for (const atribuicaoId of selectedAtivos) {
        await devolverAtivo.mutateAsync(atribuicaoId);
      }
      
      resetDevolverForm();
      setDevolverDialogOpen(false);
    } catch (error) {
      console.error("Erro ao devolver:", error);
    }
  };

  const resetAtribuirForm = () => {
    setSelectedFuncionario("");
    setSelectedAtivos([]);
    setObservacoes("");
  };

  const resetDevolverForm = () => {
    setSelectedFuncionario("");
    setSelectedAtivos([]);
  };

  const toggleAtivoSelection = (ativoId: string) => {
    setSelectedAtivos((prev) =>
      prev.includes(ativoId)
        ? prev.filter((id) => id !== ativoId)
        : [...prev, ativoId]
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Atribuições"
        description="Gerencie a atribuição e devolução de ativos aos funcionários"
        icon={ArrowLeftRight}
      />

      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => setAtribuirDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Atribuir Ativo
          </Button>
          <Button
            variant="outline"
            onClick={() => setDevolverDialogOpen(true)}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Registrar Devolução
          </Button>
        </div>

        {/* Lista de Atribuições */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Histórico de Atribuições</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar atribuição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredAtribuicoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atribuição encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Data Atribuição</TableHead>
                      <TableHead>Data Devolução</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAtribuicoes.map((atribuicao) => (
                      <TableRow key={atribuicao.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {atribuicao.ativo?.nome || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {atribuicao.ativo?.patrimonio}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {atribuicao.funcionario?.nome || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {atribuicao.funcionario?.cargo}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {atribuicao.data_atribuicao
                            ? format(
                                new Date(atribuicao.data_atribuicao),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {atribuicao.data_devolucao
                            ? format(
                                new Date(atribuicao.data_devolucao),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              statusColors[atribuicao.status || ""] ||
                              "bg-gray-100"
                            }
                          >
                            {atribuicao.status || "N/A"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Atribuir Ativo */}
      <Dialog open={atribuirDialogOpen} onOpenChange={setAtribuirDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Atribuir Ativos
            </DialogTitle>
            <DialogDescription>
              Selecione um funcionário e os ativos que deseja atribuir
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Selecionar Funcionário */}
            <div className="space-y-2">
              <Label>Funcionário *</Label>
              <Select
                value={selectedFuncionario}
                onValueChange={(value) => {
                  setSelectedFuncionario(value);
                  setSelectedAtivos([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      {func.nome} {func.cargo && `- ${func.cargo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de Ativos Disponíveis */}
            {selectedFuncionario && (
              <div className="space-y-2">
                <Label>Ativos Disponíveis *</Label>
                {ativosDisponiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum ativo disponível para atribuição
                  </p>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {ativosDisponiveis.map((ativo) => (
                      <div
                        key={ativo.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={ativo.id}
                          checked={selectedAtivos.includes(ativo.id)}
                          onCheckedChange={() => toggleAtivoSelection(ativo.id)}
                        />
                        <label
                          htmlFor={ativo.id}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium">{ativo.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            Patrimônio: {ativo.patrimonio}
                            {ativo.marca && ` | ${ativo.marca}`}
                            {ativo.modelo && ` ${ativo.modelo}`}
                          </p>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedAtivos.length} ativo(s) selecionado(s)
                </p>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações sobre esta atribuição..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetAtribuirForm();
                setAtribuirDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAtribuir}
              disabled={
                !selectedFuncionario ||
                selectedAtivos.length === 0 ||
                createAtribuicao.isPending
              }
            >
              {createAtribuicao.isPending ? "Atribuindo..." : "Confirmar Atribuição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Devolver Ativo */}
      <Dialog open={devolverDialogOpen} onOpenChange={setDevolverDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Registrar Devolução
            </DialogTitle>
            <DialogDescription>
              Selecione o funcionário e os ativos a serem devolvidos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Selecionar Funcionário */}
            <div className="space-y-2">
              <Label>Funcionário *</Label>
              <Select
                value={selectedFuncionario}
                onValueChange={(value) => {
                  setSelectedFuncionario(value);
                  setSelectedAtivos([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {/* Apenas funcionários com ativos atribuídos */}
                  {funcionarios
                    .filter((func) =>
                      atribuicoesAtivas.some(
                        (attr) => attr.funcionario_id === func.id
                      )
                    )
                    .map((func) => (
                      <SelectItem key={func.id} value={func.id}>
                        {func.nome} {func.cargo && `- ${func.cargo}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lista de Ativos do Funcionário */}
            {selectedFuncionario && (
              <div className="space-y-2">
                <Label>Ativos Atribuídos *</Label>
                {atribuicoesFuncionario.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Este funcionário não possui ativos atribuídos
                  </p>
                ) : (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {atribuicoesFuncionario.map((attr) => (
                      <div
                        key={attr.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`dev-${attr.id}`}
                          checked={selectedAtivos.includes(attr.id)}
                          onCheckedChange={() => toggleAtivoSelection(attr.id)}
                        />
                        <label
                          htmlFor={`dev-${attr.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium">
                            {attr.ativo?.nome || "Ativo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Patrimônio: {attr.ativo?.patrimonio}
                            {attr.data_atribuicao &&
                              ` | Atribuído em: ${format(
                                new Date(attr.data_atribuicao),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )}`}
                          </p>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {selectedAtivos.length} ativo(s) selecionado(s) para devolução
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetDevolverForm();
                setDevolverDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDevolver}
              disabled={selectedAtivos.length === 0 || devolverAtivo.isPending}
            >
              {devolverAtivo.isPending ? "Devolvendo..." : "Confirmar Devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
