import { useState, useMemo, useRef } from "react";
import { useContratoItens, ContratoItem } from "@/hooks/useContratoItens";
import { useFuncionarios } from "@/hooks/useFuncionarios";
import { useEmpresas } from "@/hooks/useEmpresas";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UserPlus, Undo2, Trash2, Edit, Package, Users, DollarSign, Box, Building2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  disponivel: "bg-green-500/10 text-green-700 dark:text-green-300",
  em_uso: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  manutencao: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  devolvido: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Manutenção",
  devolvido: "Devolvido",
};

const ACESSORIOS_OPTIONS = ["Capa", "Coldre", "Gatilho", "Bateria Reserva"];

interface ContratoItensProps {
  contratoId: string;
}

export function ContratoItens({ contratoId }: ContratoItensProps) {
  const { itens, isLoading, createItem, updateItem, deleteItem, atribuirItem, devolverItem } = useContratoItens(contratoId);
  const { funcionarios } = useFuncionarios();
  const { empresas } = useEmpresas();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContratoItem | null>(null);
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false);
  const [atribuirItemId, setAtribuirItemId] = useState<string | null>(null);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    modelo: "",
    identificador: "",
    endereco_mac: "",
    valor_mensal: "",
    data_entrega: "",
    funcionario_id: "",
    acessorios: [] as string[],
    observacoes: "",
  });

  const activeFuncionarios = funcionarios.filter((f) => f.active !== false);

  const resetForm = () => {
    setEditingItem(null);
    setFormData({ modelo: "", identificador: "", endereco_mac: "", valor_mensal: "", data_entrega: "", funcionario_id: "", acessorios: [], observacoes: "" });
  };

  const toggleAcessorio = (acessorio: string) => {
    setFormData((prev) => ({
      ...prev,
      acessorios: prev.acessorios.includes(acessorio)
        ? prev.acessorios.filter((a) => a !== acessorio)
        : [...prev.acessorios, acessorio],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      contrato_id: contratoId,
      modelo: formData.modelo || null,
      identificador: formData.identificador || null,
      endereco_mac: formData.endereco_mac || null,
      data_entrega: formData.data_entrega || null,
      acessorios: formData.acessorios.length > 0 ? formData.acessorios : null,
      funcionario_id: formData.funcionario_id || null,
      valor_mensal: formData.valor_mensal ? parseFloat(formData.valor_mensal) : null,
      observacoes: formData.observacoes || null,
    };

    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        ...payload,
        status: payload.funcionario_id ? "em_uso" : "disponivel",
      });
    } else {
      await createItem.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: ContratoItem) => {
    setEditingItem(item);
    setFormData({
      modelo: item.modelo || "",
      identificador: item.identificador || "",
      endereco_mac: item.endereco_mac || "",
      valor_mensal: item.valor_mensal?.toString() || "",
      data_entrega: item.data_entrega || "",
      funcionario_id: item.funcionario_id || "",
      acessorios: item.acessorios || [],
      observacoes: item.observacoes || "",
    });
    setIsDialogOpen(true);
  };

  const handleAtribuir = (itemId: string) => {
    setAtribuirItemId(itemId);
    setSelectedFuncionarioId("");
    setAtribuirDialogOpen(true);
  };

  const confirmAtribuir = async () => {
    if (atribuirItemId && selectedFuncionarioId) {
      await atribuirItem.mutateAsync({ itemId: atribuirItemId, funcionarioId: selectedFuncionarioId });
      setAtribuirDialogOpen(false);
    }
  };

  const handleImportXLS = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      if (rows.length === 0) {
        toast.error("Planilha vazia");
        return;
      }

      let imported = 0;
      for (const row of rows) {
        const modelo = String(row["MODELO"] || row["modelo"] || "").trim();
        const serie = String(row["NUM SERIE"] || row["NEM SERIE"] || row["N. SERIE"] || row["NUMERO SERIE"] || row["num serie"] || row["serie"] || "").trim();
        const mac = String(row["ENDEREÇO MAC"] || row["ENDERECO MAC"] || row["MAC"] || row["endereço mac"] || row["mac"] || "").trim();

        if (!modelo && !serie && !mac) continue;

        await createItem.mutateAsync({
          contrato_id: contratoId,
          modelo: modelo || null,
          identificador: serie || null,
          endereco_mac: mac || null,
          valor_mensal: null,
          data_entrega: null,
          funcionario_id: null,
          acessorios: null,
          observacoes: null,
        });
        imported++;
      }

      toast.success(`${imported} coletor(es) importado(s) com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar planilha");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getEmpresaFromFuncionario = (funcionarioId: string | null) => {
    if (!funcionarioId) return null;
    const func = funcionarios.find((f) => f.id === funcionarioId);
    if (!func?.empresa_id) return null;
    return empresas.find((e) => e.id === func.empresa_id) || null;
  };

  // Rateio por empresa
  const rateio = useMemo(() => {
    const map = new Map<string, { nome: string; qtd: number; valor: number }>();
    let semAtribuicaoQtd = 0;
    let semAtribuicaoValor = 0;

    for (const item of itens) {
      const empresa = getEmpresaFromFuncionario(item.funcionario_id);
      const valor = item.valor_mensal || 0;
      if (!empresa) {
        semAtribuicaoQtd++;
        semAtribuicaoValor += valor;
      } else {
        const existing = map.get(empresa.id);
        if (existing) {
          existing.qtd++;
          existing.valor += valor;
        } else {
          map.set(empresa.id, { nome: empresa.nome, qtd: 1, valor });
        }
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    if (semAtribuicaoQtd > 0) {
      rows.push({ nome: "Sem atribuição", qtd: semAtribuicaoQtd, valor: semAtribuicaoValor });
    }
    return rows;
  }, [itens, funcionarios, empresas]);

  // KPIs
  const totalItens = itens.length;
  const emUso = itens.filter((i) => i.status === "em_uso").length;
  const disponiveis = itens.filter((i) => i.status === "disponivel").length;
  const custoMensal = itens.reduce((sum, i) => sum + (i.valor_mensal || 0), 0);

  const kpis = [
    { icon: Box, label: "Total", value: totalItens, color: "bg-violet-500/10 text-violet-600" },
    { icon: Users, label: "Em uso", value: emUso, color: "bg-blue-500/10 text-blue-600" },
    { icon: Package, label: "Disponíveis", value: disponiveis, color: "bg-green-500/10 text-green-600" },
    { icon: DollarSign, label: "Custo mensal", value: `R$ ${custoMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "bg-orange-500/10 text-orange-600" },
  ];

  if (isLoading) return <Skeleton className="h-48" />;

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-sm font-semibold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rateio por Empresa */}
      {rateio.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Rateio por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-center">Qtd Equipamentos</TableHead>
                  <TableHead className="text-right">Valor Mensal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateio.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.nome}</TableCell>
                    <TableCell className="text-center">{row.qtd}</TableCell>
                    <TableCell className="text-right">{fmtCurrency(row.valor)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-t-2">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{totalItens}</TableCell>
                  <TableCell className="text-right">{fmtCurrency(custoMensal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Coletores de Dados</CardTitle>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportXLS}
            />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" /> {isImporting ? "Importando..." : "Importar XLS"}
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Coletor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>N. Série</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Valor Locação</TableHead>
                  <TableHead>Acessórios</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const func = funcionarios.find((f) => f.id === item.funcionario_id);
                  const empresa = getEmpresaFromFuncionario(item.funcionario_id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.modelo || "-"}</TableCell>
                      <TableCell>{item.identificador || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.endereco_mac || "-"}</TableCell>
                      <TableCell>{func?.nome || "-"}</TableCell>
                      <TableCell>{empresa?.nome || "-"}</TableCell>
                      <TableCell>{item.valor_mensal ? fmtCurrency(item.valor_mensal) : "-"}</TableCell>
                      <TableCell>
                        {item.acessorios && item.acessorios.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.acessorios.map((a) => (
                              <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
                            ))}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("capitalize", statusColors[item.status] || "")}>
                          {statusLabels[item.status] || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {item.status !== "em_uso" && (
                          <Button variant="ghost" size="icon" onClick={() => handleAtribuir(item.id)} title="Atribuir">
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === "em_uso" && (
                          <Button variant="ghost" size="icon" onClick={() => devolverItem.mutate(item.id)} title="Devolver">
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {itens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum coletor cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog criar/editar coletor */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Coletor" : "Novo Coletor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={formData.modelo} onChange={(e) => setFormData({ ...formData, modelo: e.target.value })} placeholder="Ex: AUTOID9N" />
              </div>
              <div className="space-y-2">
                <Label>Número de Série</Label>
                <Input value={formData.identificador} onChange={(e) => setFormData({ ...formData, identificador: e.target.value })} placeholder="Ex: 90B221101432" />
              </div>
              <div className="space-y-2">
                <Label>Endereço MAC</Label>
                <Input value={formData.endereco_mac} onChange={(e) => setFormData({ ...formData, endereco_mac: e.target.value })} placeholder="Ex: 78:8e:33:35:3e:f3" />
              </div>
              <div className="space-y-2">
                <Label>Valor de Locação (R$)</Label>
                <Input type="number" step="0.01" value={formData.valor_mensal} onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data da Entrega</Label>
                <Input type="date" value={formData.data_entrega} onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <FuncionarioCombobox
                  value={formData.funcionario_id}
                  onValueChange={(v) => setFormData({ ...formData, funcionario_id: v })}
                  funcionarios={activeFuncionarios}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Acessórios</Label>
                <div className="flex flex-wrap gap-4">
                  {ACESSORIOS_OPTIONS.map((acessorio) => (
                    <label key={acessorio} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.acessorios.includes(acessorio)}
                        onCheckedChange={() => toggleAcessorio(acessorio)}
                      />
                      <span className="text-sm">{acessorio}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observações</Label>
                <Textarea value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                {editingItem ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog atribuir */}
      <Dialog open={atribuirDialogOpen} onOpenChange={setAtribuirDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Coletor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <FuncionarioCombobox
                value={selectedFuncionarioId}
                onValueChange={setSelectedFuncionarioId}
                funcionarios={activeFuncionarios}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAtribuir} disabled={!selectedFuncionarioId || atribuirItem.isPending}>
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
