import { useState } from "react";
import { VehicleLayout } from "@/components/VehicleLayout";
import { PageHeader } from "@/components/PageHeader";
import { useVeiculos } from "@/hooks/useVeiculos";
import { useEmpresasSelect, useFuncionariosCombobox } from "@/hooks/useSelectOptions";
import { useVeiculosHistoricoResponsavel } from "@/hooks/useVeiculosHistoricoResponsavel";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, Car, History, DollarSign, FileText, ClipboardList, Shield, Upload } from "lucide-react";
import { ImportVeiculosDialog } from "@/components/ImportVeiculosDialog";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/DataTablePagination";
import { FuncionarioCombobox } from "@/components/FuncionarioCombobox";
import { HistoricoVeiculoDialog } from "@/components/HistoricoVeiculoDialog";
import { ConfirmResponsavelDialog } from "@/components/ConfirmResponsavelDialog";
import { ConsultaFipeDialog } from "@/components/ConsultaFipeDialog";
import { VeiculoDocumentosSection } from "@/components/VeiculoDocumentosSection";
import { VeiculoLicenciamentoTab } from "@/components/VeiculoLicenciamentoTab";
import { VeiculoSegurosTab } from "@/components/VeiculoSegurosTab";
import { VeiculosDashboard } from "@/components/VeiculosDashboard";
import { ConsultaFipeMassaDialog } from "@/components/ConsultaFipeMassaDialog";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  disponivel: "bg-status-success/10 text-status-success",
  em_uso: "bg-status-info/10 text-status-info",
  manutencao: "bg-status-warning/10 text-status-warning",
  baixado: "bg-status-error/10 text-status-error",
};

const tiposVeiculo = [
  { value: "carro", label: "Carro" },
  { value: "caminhao", label: "Caminhão" },
  { value: "caminhonete", label: "Caminhonete" },
  { value: "furgao", label: "Furgão" },
  { value: "moto", label: "Moto" },
  { value: "pickup", label: "Pickup" },
  { value: "van", label: "Van" },
];

const PAGE_SIZE = 25;

export default function Veiculos() {
  const { veiculos, isLoading, createVeiculo, updateVeiculo, deleteVeiculo } = useVeiculos();
  const { funcionarios: funcionariosCombobox } = useFuncionariosCombobox();
  const { empresas } = useEmpresasSelect();
  const { registrarAlteracaoResponsavel } = useVeiculosHistoricoResponsavel();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historicoVeiculoPlaca, setHistoricoVeiculoPlaca] = useState<string | null>(null);
  const [historicoVeiculoInfo, setHistoricoVeiculoInfo] = useState<string>("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<typeof formData | null>(null);
  const [fipeDialogOpen, setFipeDialogOpen] = useState(false);
  const [fipeVeiculoId, setFipeVeiculoId] = useState<string | null>(null);
  const [fipeVeiculoInfo, setFipeVeiculoInfo] = useState("");
  const [fipeVeiculoTipo, setFipeVeiculoTipo] = useState("carro");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("dados");
  const [empresaFilter, setEmpresaFilter] = useState<string | null>(null);
  const [fipeMassaDialogOpen, setFipeMassaDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    placa: "",
    renavam: "",
    chassi: "",
    codigo_fipe: "",
    tipo: "",
    marca: "",
    modelo: "",
    ano_modelo: "",
    ano_fabricacao: "",
    propriedade: "empresa",
    empresa_id: "",
    cor: "",
    combustivel: "",
    status: "disponivel",
    funcionario_id: "",
    data_aquisicao: "",
    valor_aquisicao: "",
    // Licenciamento
    licenciamento_valor: "",
    licenciamento_vencimento: "",
    licenciamento_situacao: "nao_pago",
    // IPVA
    ipva_valor: "",
    ipva_vencimento: "",
    ipva_situacao: "nao_pago",
    // Restrição
    restricao: false,
    restricao_descricao: "",
    // Seguro
    possui_seguro: false,
    seguro_vencimento: "",
    seguro_valor: "",
    seguro_apolice: "",
  });

  // Filtragem client-side (para conjuntos pequenos, manteremos assim)
  const filteredVeiculos = veiculos.filter((v) => {
    const matchesSearch =
      v.placa?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      v.marca?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      v.modelo?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesEmpresa =
      !empresaFilter ||
      (empresaFilter === "particular" ? !v.empresa_id : v.empresa_id === empresaFilter);
    
    return matchesSearch && matchesEmpresa;
  });

  // Paginação client-side
  const totalCount = filteredVeiculos.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginatedVeiculos = filteredVeiculos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // Verificar se o responsável mudou
      const veiculoAtual = veiculos.find(v => v.id === editingId);
      const responsavelAnterior = veiculoAtual?.funcionario_id || null;
      const responsavelNovo = formData.funcionario_id || null;
      
      if (responsavelAnterior !== responsavelNovo) {
        // Abrir dialog de confirmação
        setPendingFormData({ ...formData });
        setConfirmDialogOpen(true);
        return;
      }
    }
    
    // Proceder com salvamento normal
    await saveVeiculo(formData, null);
  };

  const saveVeiculo = async (data: typeof formData, observacoes: string | null) => {
    const veiculoData = {
      placa: data.placa,
      renavam: data.renavam || null,
      chassi: data.chassi || null,
      codigo_fipe: data.codigo_fipe || null,
      tipo: data.tipo || null,
      marca: data.marca,
      modelo: data.modelo,
      ano_modelo: data.ano_modelo ? parseInt(data.ano_modelo) : null,
      ano_fabricacao: data.ano_fabricacao ? parseInt(data.ano_fabricacao) : null,
      propriedade: data.propriedade || "empresa",
      empresa_id: data.propriedade === "empresa" && data.empresa_id ? data.empresa_id : null,
      cor: data.cor || null,
      combustivel: data.combustivel || null,
      status: data.status || "disponivel",
      funcionario_id: data.funcionario_id || null,
      data_aquisicao: data.data_aquisicao || null,
      valor_aquisicao: data.valor_aquisicao ? parseFloat(data.valor_aquisicao) : null,
      // Licenciamento
      licenciamento_valor: data.licenciamento_valor ? parseFloat(data.licenciamento_valor) : null,
      licenciamento_vencimento: data.licenciamento_vencimento || null,
      licenciamento_situacao: data.licenciamento_situacao || "nao_pago",
      // IPVA
      ipva_valor: data.ipva_valor ? parseFloat(data.ipva_valor) : null,
      ipva_vencimento: data.ipva_vencimento || null,
      ipva_situacao: data.ipva_situacao || "nao_pago",
      // Restrição
      restricao: data.restricao,
      restricao_descricao: data.restricao ? data.restricao_descricao : null,
      // Seguro
      possui_seguro: data.possui_seguro,
      seguro_vencimento: data.possui_seguro && data.seguro_vencimento ? data.seguro_vencimento : null,
      seguro_valor: data.possui_seguro && data.seguro_valor ? parseFloat(data.seguro_valor) : null,
      seguro_apolice: data.possui_seguro ? data.seguro_apolice : null,
    };
    
    if (editingId) {
      const veiculoAtual = veiculos.find(v => v.id === editingId);
      const responsavelAnterior = veiculoAtual?.funcionario_id || null;
      const responsavelNovo = data.funcionario_id || null;
      
      await updateVeiculo.mutateAsync({ id: editingId, ...veiculoData });
      
      // Registrar histórico se responsável mudou
      if (responsavelAnterior !== responsavelNovo) {
        await registrarAlteracaoResponsavel.mutateAsync({
          veiculo_placa: veiculoAtual?.placa,
          funcionario_anterior_id: responsavelAnterior,
          funcionario_novo_id: responsavelNovo,
          observacoes: observacoes || "Alteração via edição de veículo",
        });
      }
    } else {
      await createVeiculo.mutateAsync(veiculoData);
      // Registrar primeiro responsável se houver
      if (data.funcionario_id) {
        await registrarAlteracaoResponsavel.mutateAsync({
          veiculo_placa: data.placa,
          funcionario_anterior_id: null,
          funcionario_novo_id: data.funcionario_id,
          observacoes: observacoes || "Responsável inicial ao cadastrar veículo",
        });
      }
    }
    setIsDialogOpen(false);
    setConfirmDialogOpen(false);
    setPendingFormData(null);
    resetForm();
  };

  const handleConfirmResponsavel = async (observacoes: string) => {
    if (pendingFormData) {
      await saveVeiculo(pendingFormData, observacoes);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setActiveTab("dados");
    setFormData({
      placa: "",
      renavam: "",
      chassi: "",
      codigo_fipe: "",
      tipo: "",
      marca: "",
      modelo: "",
      ano_modelo: "",
      ano_fabricacao: "",
      propriedade: "empresa",
      empresa_id: "",
      cor: "",
      combustivel: "",
      status: "disponivel",
      funcionario_id: "",
      data_aquisicao: "",
      valor_aquisicao: "",
      licenciamento_valor: "",
      licenciamento_vencimento: "",
      licenciamento_situacao: "nao_pago",
      ipva_valor: "",
      ipva_vencimento: "",
      ipva_situacao: "nao_pago",
      restricao: false,
      restricao_descricao: "",
      possui_seguro: false,
      seguro_vencimento: "",
      seguro_valor: "",
      seguro_apolice: "",
    });
  };

  const handleEdit = (veiculo: (typeof veiculos)[0]) => {
    setEditingId(veiculo.id);
    setFormData({
      placa: veiculo.placa || "",
      renavam: veiculo.renavam || "",
      chassi: veiculo.chassi || "",
      codigo_fipe: (veiculo as any).codigo_fipe || "",
      tipo: veiculo.tipo || "",
      marca: veiculo.marca || "",
      modelo: veiculo.modelo || "",
      ano_modelo: veiculo.ano_modelo?.toString() || "",
      ano_fabricacao: veiculo.ano_fabricacao?.toString() || "",
      propriedade: (veiculo as any).propriedade || "empresa",
      empresa_id: veiculo.empresa_id || "",
      cor: veiculo.cor || "",
      combustivel: veiculo.combustivel || "",
      status: veiculo.status || "disponivel",
      funcionario_id: veiculo.funcionario_id || "",
      data_aquisicao: veiculo.data_aquisicao || "",
      valor_aquisicao: veiculo.valor_aquisicao?.toString() || "",
      licenciamento_valor: (veiculo as any).licenciamento_valor?.toString() || "",
      licenciamento_vencimento: (veiculo as any).licenciamento_vencimento || "",
      licenciamento_situacao: (veiculo as any).licenciamento_situacao || "nao_pago",
      ipva_valor: (veiculo as any).ipva_valor?.toString() || "",
      ipva_vencimento: (veiculo as any).ipva_vencimento || "",
      ipva_situacao: (veiculo as any).ipva_situacao || "nao_pago",
      restricao: (veiculo as any).restricao || false,
      restricao_descricao: (veiculo as any).restricao_descricao || "",
      possui_seguro: (veiculo as any).possui_seguro || false,
      seguro_vencimento: (veiculo as any).seguro_vencimento || "",
      seguro_valor: (veiculo as any).seguro_valor?.toString() || "",
      seguro_apolice: (veiculo as any).seguro_apolice || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este veículo?")) {
      await deleteVeiculo.mutateAsync(id);
    }
  };

  return (
    <VehicleLayout>
      <div className="space-y-6">
        <PageHeader
          title="Veículos"
          description="Gerencie a frota de veículos"
          icon={Car}
        />

        <VeiculosDashboard
          veiculos={veiculos}
          empresas={empresas}
          empresaFilter={empresaFilter}
          onEmpresaFilterChange={setEmpresaFilter}
          onOpenFipeMassa={() => setFipeMassaDialogOpen(true)}
        />

        <ConsultaFipeMassaDialog
          open={fipeMassaDialogOpen}
          onOpenChange={setFipeMassaDialogOpen}
          veiculos={filteredVeiculos}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar veículos..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <div className="flex gap-2">
                <ImportVeiculosDialog />
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Veículo
                  </Button>
                </DialogTrigger>
              </div>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dados">
                      <Car className="h-4 w-4 mr-2" />
                      Dados
                    </TabsTrigger>
                    <TabsTrigger value="licenciamento">
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Licenc./IPVA
                    </TabsTrigger>
                    <TabsTrigger value="seguros">
                      <Shield className="h-4 w-4 mr-2" />
                      Seguros
                    </TabsTrigger>
                    {editingId && formData.placa && (
                      <TabsTrigger value="documentos">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentos
                      </TabsTrigger>
                    )}
                  </TabsList>
                  
                  <TabsContent value="dados">
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                      <div className="grid grid-cols-3 gap-4">
                        {/* Linha 1: Placa, Renavam, Chassi */}
                        <div className="space-y-2">
                          <Label htmlFor="placa">Placa *</Label>
                          <Input
                            id="placa"
                            value={formData.placa}
                            onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                            required
                            placeholder="ABC1D23"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="renavam">Renavam</Label>
                          <Input
                            id="renavam"
                            value={formData.renavam}
                            onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                            maxLength={11}
                            placeholder="00000000000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="chassi">Chassi</Label>
                          <Input
                            id="chassi"
                            value={formData.chassi}
                            onChange={(e) => setFormData({ ...formData, chassi: e.target.value.toUpperCase() })}
                            maxLength={17}
                            placeholder="9BWZZZ377VT004251"
                          />
                        </div>

                        {/* Linha 2: Tipo, Marca, Modelo, Código FIPE */}
                        <div className="space-y-2">
                          <Label htmlFor="codigo_fipe">Código FIPE</Label>
                          <Input
                            id="codigo_fipe"
                            value={formData.codigo_fipe}
                            onChange={(e) => setFormData({ ...formData, codigo_fipe: e.target.value })}
                            placeholder="001234-5"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposVeiculo.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="marca">Marca *</Label>
                          <Input
                            id="marca"
                            value={formData.marca}
                            onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="modelo">Modelo *</Label>
                          <Input
                            id="modelo"
                            value={formData.modelo}
                            onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                            required
                          />
                        </div>

                        {/* Linha 3: Ano Modelo, Ano Fab, Propriedade */}
                        <div className="space-y-2">
                          <Label htmlFor="ano_modelo">Ano Modelo</Label>
                          <Input
                            id="ano_modelo"
                            type="number"
                            value={formData.ano_modelo}
                            onChange={(e) => setFormData({ ...formData, ano_modelo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ano_fabricacao">Ano Fabricação</Label>
                          <Input
                            id="ano_fabricacao"
                            type="number"
                            value={formData.ano_fabricacao}
                            onChange={(e) => setFormData({ ...formData, ano_fabricacao: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="propriedade">Propriedade</Label>
                          <Select 
                            value={formData.propriedade} 
                            onValueChange={(v) => setFormData({ ...formData, propriedade: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empresa">Empresa</SelectItem>
                              <SelectItem value="particular">Particular</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Linha 4: Empresa (condicional), Cor, Combustível */}
                        {formData.propriedade === "empresa" && (
                          <div className="space-y-2">
                            <Label htmlFor="empresa_id">Empresa</Label>
                            <Select value={formData.empresa_id} onValueChange={(v) => setFormData({ ...formData, empresa_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {empresas.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="cor">Cor</Label>
                          <Input
                            id="cor"
                            value={formData.cor}
                            onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="combustivel">Combustível</Label>
                          <Select value={formData.combustivel} onValueChange={(v) => setFormData({ ...formData, combustivel: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gasolina">Gasolina</SelectItem>
                              <SelectItem value="etanol">Etanol</SelectItem>
                              <SelectItem value="flex">Flex</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="eletrico">Elétrico</SelectItem>
                              <SelectItem value="hibrido">Híbrido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Linha 5: Status, Responsável, Data Aquisição, Valor */}
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disponivel">Disponível</SelectItem>
                              <SelectItem value="em_uso">Em Uso</SelectItem>
                              <SelectItem value="manutencao">Manutenção</SelectItem>
                              <SelectItem value="baixado">Baixado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="funcionario_id">Responsável</Label>
                          <FuncionarioCombobox
                            value={formData.funcionario_id}
                            onValueChange={(v) => setFormData({ ...formData, funcionario_id: v })}
                            funcionarios={funcionariosCombobox}
                            placeholder="Buscar por nome ou CPF"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="data_aquisicao">Data Aquisição</Label>
                          <Input
                            id="data_aquisicao"
                            type="date"
                            value={formData.data_aquisicao}
                            onChange={(e) => setFormData({ ...formData, data_aquisicao: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="valor_aquisicao">Valor Aquisição (R$)</Label>
                          <Input
                            id="valor_aquisicao"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={formData.valor_aquisicao}
                            onChange={(e) => setFormData({ ...formData, valor_aquisicao: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={createVeiculo.isPending || updateVeiculo.isPending}>
                          {editingId ? "Salvar" : "Criar"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="licenciamento">
                    <VeiculoLicenciamentoTab
                      data={{
                        licenciamento_valor: formData.licenciamento_valor,
                        licenciamento_vencimento: formData.licenciamento_vencimento,
                        licenciamento_situacao: formData.licenciamento_situacao,
                        ipva_valor: formData.ipva_valor,
                        ipva_vencimento: formData.ipva_vencimento,
                        ipva_situacao: formData.ipva_situacao,
                        restricao: formData.restricao,
                        restricao_descricao: formData.restricao_descricao,
                        ano_fabricacao: formData.ano_fabricacao,
                      }}
                      onChange={(updates) => setFormData({ ...formData, ...updates })}
                    />
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={createVeiculo.isPending || updateVeiculo.isPending}
                      >
                        {editingId ? "Salvar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </TabsContent>
                  
                  <TabsContent value="seguros">
                    <VeiculoSegurosTab
                      data={{
                        possui_seguro: formData.possui_seguro,
                        seguro_vencimento: formData.seguro_vencimento,
                        seguro_valor: formData.seguro_valor,
                        seguro_apolice: formData.seguro_apolice,
                      }}
                      onChange={(updates) => setFormData({ ...formData, ...updates })}
                      veiculoPlaca={editingId ? formData.placa : null}
                      isEditing={!!editingId}
                    />
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                      <Button 
                        onClick={handleSubmit} 
                        disabled={createVeiculo.isPending || updateVeiculo.isPending}
                      >
                        {editingId ? "Salvar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </TabsContent>
                  
                  {editingId && formData.placa && (
                    <TabsContent value="documentos">
                      <VeiculoDocumentosSection veiculoPlaca={formData.placa} />
                    </TabsContent>
                  )}
                </Tabs>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Placa</TableHead>
                      <TableHead>Marca/Modelo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Renavam</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead className="text-right">Valor FIPE</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVeiculos.map((veiculo) => (
                      <TableRow key={veiculo.id}>
                        <TableCell className="font-medium">{veiculo.placa}</TableCell>
                        <TableCell>{veiculo.marca} {veiculo.modelo}</TableCell>
                        <TableCell>{veiculo.ano_modelo || "-"}</TableCell>
                        <TableCell>{veiculo.renavam || "-"}</TableCell>
                        <TableCell>
                          <Badge className={cn("capitalize", statusColors[veiculo.status || "disponivel"])}>
                            {veiculo.status?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{(veiculo as any).funcionario?.nome || "-"}</TableCell>
                        <TableCell className="text-right">
                          {(veiculo as any).valor_fipe ? (
                            <div className="text-right">
                              <div className="font-medium">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format((veiculo as any).valor_fipe)}
                              </div>
                              {(veiculo as any).data_consulta_fipe && (
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date((veiculo as any).data_consulta_fipe), "dd/MM/yyyy")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Consultar FIPE"
                            onClick={() => {
                              setFipeVeiculoId(veiculo.id);
                              setFipeVeiculoInfo(`${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}`);
                              setFipeVeiculoTipo(veiculo.tipo || "carro");
                              setFipeDialogOpen(true);
                            }}
                          >
                            <DollarSign className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Histórico de responsáveis"
                            onClick={() => {
                              setHistoricoVeiculoPlaca(veiculo.placa);
                              setHistoricoVeiculoInfo(`${veiculo.placa} - ${veiculo.marca} ${veiculo.modelo}`);
                            }}
                          >
                            <History className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(veiculo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(veiculo.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginatedVeiculos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhum veículo encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {totalCount > PAGE_SIZE && (
                  <DataTablePagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        <HistoricoVeiculoDialog
          veiculoPlaca={historicoVeiculoPlaca}
          veiculoInfo={historicoVeiculoInfo}
          open={!!historicoVeiculoPlaca}
          onOpenChange={(open) => {
            if (!open) {
              setHistoricoVeiculoPlaca(null);
              setHistoricoVeiculoInfo("");
            }
          }}
        />

        <ConfirmResponsavelDialog
          open={confirmDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDialogOpen(false);
              setPendingFormData(null);
            }
          }}
          responsavelAnteriorNome={
            editingId
              ? funcionariosCombobox.find(
                  (f) => f.id === veiculos.find((v) => v.id === editingId)?.funcionario_id
                )?.nome || null
              : null
          }
          responsavelNovoNome={
            funcionariosCombobox.find((f) => f.id === pendingFormData?.funcionario_id)?.nome || null
          }
          veiculoInfo={pendingFormData ? `${pendingFormData.placa} - ${pendingFormData.marca} ${pendingFormData.modelo}` : ""}
          onConfirm={handleConfirmResponsavel}
          isPending={updateVeiculo.isPending || registrarAlteracaoResponsavel.isPending}
        />

        {fipeVeiculoId && (
          <ConsultaFipeDialog
            open={fipeDialogOpen}
            onOpenChange={(open) => {
              setFipeDialogOpen(open);
              if (!open) {
                setFipeVeiculoId(null);
                setFipeVeiculoInfo("");
              }
            }}
            veiculoId={fipeVeiculoId}
            veiculoInfo={fipeVeiculoInfo}
            tipoInicial={fipeVeiculoTipo}
          />
        )}
      </div>
    </VehicleLayout>
  );
}
