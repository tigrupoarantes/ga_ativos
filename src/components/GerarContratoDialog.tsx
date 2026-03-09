import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/external-client";
import { useContratoComodato, type DadosContratoComodato } from "@/hooks/useContratoComodato";

interface Ativo {
  id: string;
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  imei?: string | null;
  imei2?: string | null;
  chip_linha?: string | null;
  valor_aquisicao?: number | null;
  acessorios?: string | null;
  funcionario_id?: string | null;
  status?: string | null;
  tipo?: { id?: string; name?: string | null } | null;
  funcionario?: { id: string; nome: string; cargo?: string | null } | null;
  empresa?: { id: string; nome: string; cnpj?: string | null } | null;
}

interface GerarContratoDialogProps {
  ativo: Ativo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FuncionarioDetalhes {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  cidade: string | null;
  endereco: string | null;
  cargo: string | null;
  empresa_id: string | null;
  empresa?: { id: string; nome: string; cnpj?: string | null } | null;
}

interface AtribuicaoAtiva {
  id: string;
  data_atribuicao: string | null;
  contrato_pdf_url: string | null;
  contrato_gerado_em: string | null;
}

function isCelular(tipoName: string | null | undefined) {
  return !!tipoName?.toLowerCase().includes("celular");
}

function isNotebook(tipoName: string | null | undefined) {
  const n = tipoName?.toLowerCase() ?? "";
  return n.includes("notebook") || n.includes("microinform") || n.includes("computador");
}

export function GerarContratoDialog({ ativo, open, onOpenChange }: GerarContratoDialogProps) {
  const { gerarEFazerUpload, baixarContratoExistente, isGenerating } = useContratoComodato();

  const [funcionario, setFuncionario] = useState<FuncionarioDetalhes | null>(null);
  const [empresaComodante, setEmpresaComodante] = useState<{ id: string; nome: string; cnpj?: string | null } | null>(null);
  const [atribuicao, setAtribuicao] = useState<AtribuicaoAtiva | null>(null);
  const [loadingDados, setLoadingDados] = useState(false);

  // Campos editáveis (preenchidos se estiverem vazios no banco)
  const [rg, setRg] = useState("");
  const [cidade, setCidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [acessorios, setAcessorios] = useState("");

  // Depois que geramos, atualizar a URL localmente
  const [contratoUrl, setContratoUrl] = useState<string | null>(null);
  const [contratoGeradoEm, setContratoGeradoEm] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !ativo?.id) return;

    setFuncionario(null);
    setAtribuicao(null);
    setContratoUrl(null);
    setContratoGeradoEm(null);
    setEmpresaComodante(null);

    async function carregarDados() {
      setLoadingDados(true);
      try {
        // Buscar funcionário com campos de comodato + empresa
        if (ativo!.funcionario_id) {
          const { data: func } = await supabase
            .from("funcionarios")
            .select("id, nome, cpf, rg, cidade, endereco, cargo, empresa_id, empresa:empresas!funcionarios_empresa_id_fkey(id, nome, cnpj)")
            .eq("id", ativo!.funcionario_id)
            .single();

          if (func) {
            const f = func as unknown as FuncionarioDetalhes;
            setFuncionario(f);
            setRg(f.rg ?? "");
            setCidade(f.cidade ?? "");
            setEndereco(f.endereco ?? "");
            if (f.empresa) setEmpresaComodante(f.empresa as any);
          }
        }

        // Buscar atribuição ativa deste ativo
        let { data: atr } = await supabase
          .from("atribuicoes")
          .select("id, data_atribuicao, contrato_pdf_url, contrato_gerado_em")
          .eq("ativo_id", ativo!.id)
          .eq("active", true)
          .is("data_devolucao", null)
          .order("data_atribuicao", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Se não há atribuição registrada mas o ativo tem funcionário,
        // criar uma agora para poder vincular o contrato
        if (!atr && ativo!.funcionario_id) {
          const { data: novaAtr } = await supabase
            .from("atribuicoes")
            .insert({
              ativo_id: ativo!.id,
              funcionario_id: ativo!.funcionario_id,
              data_atribuicao: new Date().toISOString(),
              status: "Ativo",
            })
            .select("id, data_atribuicao, contrato_pdf_url, contrato_gerado_em")
            .single();
          atr = novaAtr as any;
        }

        if (atr) {
          setAtribuicao(atr as unknown as AtribuicaoAtiva);
          setContratoUrl((atr as any).contrato_pdf_url ?? null);
          setContratoGeradoEm((atr as any).contrato_gerado_em ?? null);
        }

        // Acessórios do próprio ativo
        setAcessorios((ativo as any).acessorios ?? "");
      } finally {
        setLoadingDados(false);
      }
    }

    carregarDados();
  }, [open, ativo?.id]);

  async function salvarCamposExtrasNoBanco() {
    if (!funcionario) return;
    // Salvar RG/cidade/endereço no funcionário se preenchidos
    const updates: Record<string, string> = {};
    if (rg && !funcionario.rg) updates.rg = rg;
    if (cidade && !funcionario.cidade) updates.cidade = cidade;
    if (endereco && !funcionario.endereco) updates.endereco = endereco;
    if (Object.keys(updates).length > 0) {
      await supabase.from("funcionarios").update(updates).eq("id", funcionario.id);
    }
    // Salvar acessórios no ativo se preenchido
    if (acessorios && ativo && !(ativo as any).acessorios) {
      await supabase.from("assets").update({ acessorios } as any).eq("id", ativo.id);
    }
  }

  async function handleGerar() {
    if (!ativo || !funcionario || !atribuicao) return;

    // Salvar campos extras antes de gerar
    await salvarCamposExtrasNoBanco();

    const dados: DadosContratoComodato = {
      funcionario: {
        id: funcionario.id,
        nome: funcionario.nome,
        cpf: funcionario.cpf ?? "",
        rg: rg || funcionario.rg,
        cidade: cidade || funcionario.cidade,
        endereco: endereco || funcionario.endereco,
        cargo: funcionario.cargo,
      },
      ativo: {
        id: ativo.id,
        nome: ativo.nome,
        marca: ativo.marca,
        modelo: ativo.modelo,
        numero_serie: ativo.numero_serie,
        imei: ativo.imei,
        imei2: ativo.imei2 ?? (ativo as any).imei2,
        chip_linha: ativo.chip_linha,
        valor_aquisicao: ativo.valor_aquisicao,
        acessorios: acessorios || (ativo as any).acessorios,
        tipo: ativo.tipo,
      },
      atribuicao: {
        id: atribuicao.id,
        data_atribuicao: atribuicao.data_atribuicao,
        contrato_pdf_url: atribuicao.contrato_pdf_url,
        contrato_gerado_em: atribuicao.contrato_gerado_em,
      },
      empresa: empresaComodante ?? ativo.empresa,
    };

    const url = await gerarEFazerUpload(dados);
    if (url) {
      setContratoUrl(url);
      setContratoGeradoEm(new Date().toISOString());
    }
  }

  const tipoName = ativo?.tipo?.name;
  const tipoSuportado = isCelular(tipoName) || isNotebook(tipoName);
  const precisaCamposCelular = isCelular(tipoName);
  const camposFaltando =
    precisaCamposCelular
      ? !rg || !cidade || !endereco
      : false;

  const nomeArquivo = funcionario
    ? `contrato-comodato-${funcionario.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`
    : "contrato-comodato.pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Contrato de Comodato
          </DialogTitle>
        </DialogHeader>

        {loadingDados ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !tipoSuportado ? (
          <div className="flex items-center gap-3 p-4 bg-status-warning/10 rounded-lg border border-status-warning/20">
            <AlertCircle className="h-5 w-5 text-status-warning shrink-0" />
            <p className="text-sm text-status-warning">
              Contratos de comodato estão disponíveis apenas para ativos do tipo{" "}
              <strong>Celular</strong> ou <strong>Notebook</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dados do ativo */}
            <div className="bg-muted/40 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Equipamento
              </p>
              <p className="font-medium">{ativo?.nome}</p>
              {ativo?.numero_serie && (
                <p className="text-sm text-muted-foreground">Serial: {ativo.numero_serie}</p>
              )}
              {ativo?.imei && (
                <p className="text-sm text-muted-foreground">IMEI: {ativo.imei}</p>
              )}
              {ativo?.chip_linha && (
                <p className="text-sm text-muted-foreground">Chip: {ativo.chip_linha}</p>
              )}
            </div>

            {/* Dados do funcionário */}
            {funcionario && (
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Responsável
                </p>
                <p className="font-medium">{funcionario.nome}</p>
                {funcionario.cpf && (
                  <p className="text-sm text-muted-foreground">CPF: {funcionario.cpf}</p>
                )}
                {funcionario.cargo && (
                  <p className="text-sm text-muted-foreground">{funcionario.cargo}</p>
                )}
              </div>
            )}

            {loadingDados && !atribuicao && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Preparando atribuição...
              </div>
            )}

            {/* Campos adicionais para celular */}
            {precisaCamposCelular && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dados adicionais do contrato
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="rg">
                      RG{" "}
                      {!funcionario?.rg && (
                        <span className="text-status-error text-xs">*</span>
                      )}
                    </Label>
                    <Input
                      id="rg"
                      placeholder="Ex: 47.577.408-5"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cidade">
                      Cidade{" "}
                      {!funcionario?.cidade && (
                        <span className="text-status-error text-xs">*</span>
                      )}
                    </Label>
                    <Input
                      id="cidade"
                      placeholder="Ex: Bebedouro"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="endereco">
                      Endereço{" "}
                      {!funcionario?.endereco && (
                        <span className="text-status-error text-xs">*</span>
                      )}
                    </Label>
                    <Input
                      id="endereco"
                      placeholder="Ex: Rua Campos Salles, SN"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Acessórios para notebook */}
            {isNotebook(tipoName) && (
              <>
                <Separator />
                <div className="space-y-1">
                  <Label htmlFor="acessorios">Acessórios inclusos</Label>
                  <Input
                    id="acessorios"
                    placeholder="Ex: Fonte e Cabo Original"
                    value={acessorios}
                    onChange={(e) => setAcessorios(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Status do contrato existente */}
            {contratoUrl && contratoGeradoEm && (
              <div className="flex items-center gap-2 p-3 bg-status-success/10 rounded-lg border border-status-success/20">
                <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-status-success">
                    Contrato já gerado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(contratoGeradoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => baixarContratoExistente(contratoUrl, nomeArquivo)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Baixar
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {tipoSuportado && atribuicao && (
            <Button
              onClick={handleGerar}
              disabled={isGenerating || loadingDados || (precisaCamposCelular && camposFaltando)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {contratoUrl ? "Gerar Novo PDF" : "Gerar e Baixar PDF"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
