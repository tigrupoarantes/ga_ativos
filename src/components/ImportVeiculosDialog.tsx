import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle2, XCircle, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

// Types
interface VeiculoRow {
  placa: string;
  marca: string;
  modelo: string;
  tipo?: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  cor?: string;
  combustivel?: string;
  renavam?: string;
  chassi?: string;
  codigo_fipe?: string;
  proprietario?: string;
  empresa?: string;
  condutor_cpf?: string;
  licenciamento_valor?: number;
  licenciamento_vencimento?: string;
  licenciamento_situacao?: string;
  ipva_valor?: number;
  ipva_vencimento?: string;
  ipva_situacao?: string;
  seguro_apolice?: string;
  seguro_valor?: number;
  seguro_vencimento?: string;
  // Validation
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  // Resolved IDs
  empresa_id?: string | null;
  funcionario_id?: string | null;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: string[];
}

// Mapping functions
const tipoMap: Record<string, string> = {
  'carro': 'carro',
  'caminhão': 'caminhao',
  'caminhao': 'caminhao',
  'caminhonete': 'caminhonete',
  'furgão': 'furgao',
  'furgao': 'furgao',
  'moto': 'moto',
  'picape': 'pickup',
  'pickup': 'pickup',
  'van': 'van',
};

const situacaoMap: Record<string, string> = {
  'pago': 'pago',
  'não pago': 'nao_pago',
  'nao pago': 'nao_pago',
  'isento': 'isento',
  'à vencer': 'a_vencer',
  'a vencer': 'a_vencer',
};

// Mapeamento de nomes de empresas na planilha para nomes no sistema
const empresaAliases: Record<string, string> = {
  'j. arantes': 'J. ARANTES TRANSPORTES E LOGISTICA LTDA.',
  'grupo arantes': 'J. ARANTES TRANSPORTES E LOGISTICA LTDA.',
  'chok distribuidora': 'CHOK DISTRIBUIDORA DE ALIMENTOS LTDA',
  'chokdoce': 'CHOKDOCE CD',
  'g4 distribuidora': 'DISTRIBUIDORA G4 ARANTES LTDA',
};

// Utility functions
const cleanCurrency = (val: string | number | undefined): number | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const parseDate = (val: string | number | undefined): string | null => {
  if (val === undefined || val === null || val === '') return null;
  
  // Handle Excel serial date
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }
  
  const str = val.toString().trim();
  
  // Try M/D/YY or M/D/YYYY format
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Try DD/MM/YYYY format
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m}-${d}`;
  }
  
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  return null;
};

const parseAnoModelo = (val: string | number | undefined): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const str = val.toString().trim();
  
  // Format "2014 / 2015" - extract second value
  if (str.includes('/')) {
    const parts = str.split('/');
    const second = parts[1]?.trim();
    if (second) {
      const num = parseInt(second);
      return isNaN(num) ? null : num;
    }
  }
  
  const num = parseInt(str);
  return isNaN(num) ? null : num;
};

const normalizeCpf = (cpf: string | undefined): string => {
  if (!cpf) return '';
  return cpf.toString().replace(/\D/g, '');
};

const normalizeString = (str: string | undefined): string => {
  if (!str) return '';
  return str.toString().trim().toUpperCase();
};

// Header mapping
const headerMappings: Record<string, keyof VeiculoRow | null> = {
  'placa': 'placa',
  'marca': 'marca',
  'modelo': 'modelo',
  'tipo': 'tipo',
  'ano fabricacao': 'ano_fabricacao',
  'ano fabricaçao': 'ano_fabricacao',
  'ano_fabricacao': 'ano_fabricacao',
  'ano fab': 'ano_fabricacao',
  'ano modelo': 'ano_modelo',
  'ano_modelo': 'ano_modelo',
  'cor': 'cor',
  'combustivel': 'combustivel',
  'combustível': 'combustivel',
  'renavam': 'renavam',
  'chassi': 'chassi',
  'codigo fipe': 'codigo_fipe',
  'código fipe': 'codigo_fipe',
  'fipe': 'codigo_fipe',
  'proprietario': 'proprietario',
  'proprietário': 'proprietario',
  'empresa': 'empresa',
  'condutor': 'condutor_cpf',
  'cpf condutor': 'condutor_cpf',
  'cpf_condutor': 'condutor_cpf',
  'licenciamento': 'licenciamento_valor',
  'valor licenciamento': 'licenciamento_valor',
  'vencimento licenciamento': 'licenciamento_vencimento',
  'situacao licenciamento': 'licenciamento_situacao',
  'situação licenciamento': 'licenciamento_situacao',
  'ipva': 'ipva_valor',
  'valor ipva': 'ipva_valor',
  'vencimento ipva': 'ipva_vencimento',
  'situacao ipva': 'ipva_situacao',
  'situação ipva': 'ipva_situacao',
  'apolice': 'seguro_apolice',
  'apólice': 'seguro_apolice',
  'seguro apolice': 'seguro_apolice',
  'valor seguro': 'seguro_valor',
  'seguro valor': 'seguro_valor',
  'vencimento seguro': 'seguro_vencimento',
  'seguro vencimento': 'seguro_vencimento',
};

// Parse Excel file
const parseExcelFile = async (file: File): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: true });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsBinaryString(file);
  });
};

// Map raw row to VeiculoRow
const mapRowToVeiculo = (
  rawRow: Record<string, any>,
  empresasMap: Map<string, string>,
  funcionariosMap: Map<string, string>
): VeiculoRow => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Normalize headers
  const row: Record<string, any> = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = key.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[_-]/g, ' ')
      .trim();
    
    const mappedKey = headerMappings[normalizedKey];
    if (mappedKey) {
      row[mappedKey] = value;
    } else if (!row[normalizedKey]) {
      row[normalizedKey] = value;
    }
  }
  
  // Extract values
  const placa = normalizeString(row.placa);
  const marca = normalizeString(row.marca);
  const modelo = normalizeString(row.modelo);
  
  // Validate required fields
  if (!placa) errors.push('Placa obrigatória');
  if (!marca) errors.push('Marca obrigatória');
  if (!modelo) errors.push('Modelo obrigatória');
  
  // Tipo
  const tipoRaw = normalizeString(row.tipo).toLowerCase();
  const tipo = tipoMap[tipoRaw] || tipoRaw || undefined;
  
  // Anos
  const ano_fabricacao = row.ano_fabricacao ? parseInt(row.ano_fabricacao.toString()) : undefined;
  const ano_modelo = parseAnoModelo(row.ano_modelo) || ano_fabricacao;
  
  // Empresa/Proprietário
  let empresa_id: string | null = null;
  const proprietario = normalizeString(row.proprietario);
  const empresaNome = normalizeString(row.empresa);
  
  if (proprietario.toLowerCase() === 'particular') {
    // Particular - no empresa_id
    empresa_id = null;
  } else if (empresaNome) {
    // Try exact match first
    empresa_id = empresasMap.get(empresaNome.toLowerCase()) || null;
    
    // Try alias
    if (!empresa_id) {
      const aliasKey = Object.keys(empresaAliases).find(k => 
        empresaNome.toLowerCase().includes(k)
      );
      if (aliasKey) {
        empresa_id = empresasMap.get(empresaAliases[aliasKey].toLowerCase()) || null;
      }
    }
    
    // Try partial match
    if (!empresa_id) {
      for (const [nome, id] of empresasMap) {
        if (nome.includes(empresaNome.toLowerCase()) || 
            empresaNome.toLowerCase().includes(nome.split(' ')[0])) {
          empresa_id = id;
          break;
        }
      }
    }
    
    if (!empresa_id && empresaNome && proprietario.toLowerCase() !== 'particular') {
      warnings.push(`Empresa "${empresaNome}" não encontrada`);
    }
  }
  
  // Condutor by CPF
  let funcionario_id: string | null = null;
  const condutorCpf = normalizeCpf(row.condutor_cpf);
  if (condutorCpf) {
    funcionario_id = funcionariosMap.get(condutorCpf) || null;
    if (!funcionario_id) {
      warnings.push(`Condutor CPF ${condutorCpf} não encontrado`);
    }
  }
  
  // Licenciamento
  const licenciamento_valor = cleanCurrency(row.licenciamento_valor);
  const licenciamento_vencimento = parseDate(row.licenciamento_vencimento);
  const licenciamento_situacao_raw = normalizeString(row.licenciamento_situacao).toLowerCase();
  const licenciamento_situacao = situacaoMap[licenciamento_situacao_raw] || 'nao_pago';
  
  // IPVA
  const ipva_valor = cleanCurrency(row.ipva_valor);
  const ipva_vencimento = parseDate(row.ipva_vencimento);
  const ipva_situacao_raw = normalizeString(row.ipva_situacao).toLowerCase();
  const ipva_situacao = situacaoMap[ipva_situacao_raw] || 'nao_pago';
  
  // Seguro
  const seguro_apolice = normalizeString(row.seguro_apolice) || undefined;
  const seguro_valor = cleanCurrency(row.seguro_valor);
  const seguro_vencimento = parseDate(row.seguro_vencimento);
  
  // Determine status
  let status: 'valid' | 'warning' | 'error' = 'valid';
  if (errors.length > 0) status = 'error';
  else if (warnings.length > 0) status = 'warning';
  
  return {
    placa,
    marca,
    modelo,
    tipo,
    ano_fabricacao: ano_fabricacao || undefined,
    ano_modelo: ano_modelo || undefined,
    cor: normalizeString(row.cor) || undefined,
    combustivel: normalizeString(row.combustivel) || undefined,
    renavam: normalizeString(row.renavam) || undefined,
    chassi: normalizeString(row.chassi) || undefined,
    codigo_fipe: normalizeString(row.codigo_fipe) || undefined,
    proprietario,
    empresa: empresaNome || undefined,
    condutor_cpf: condutorCpf || undefined,
    licenciamento_valor: licenciamento_valor || undefined,
    licenciamento_vencimento: licenciamento_vencimento || undefined,
    licenciamento_situacao: licenciamento_situacao || undefined,
    ipva_valor: ipva_valor || undefined,
    ipva_vencimento: ipva_vencimento || undefined,
    ipva_situacao: ipva_situacao || undefined,
    seguro_apolice,
    seguro_valor: seguro_valor || undefined,
    seguro_vencimento: seguro_vencimento || undefined,
    status,
    errors,
    warnings,
    empresa_id,
    funcionario_id,
  };
};

export function ImportVeiculosDialog() {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<VeiculoRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      toast.info('Processando arquivo...');
      
      // Parse Excel
      const rawRows = await parseExcelFile(file);
      
      if (rawRows.length === 0) {
        toast.error("Arquivo vazio ou formato inválido");
        return;
      }
      
      // Fetch empresas and funcionários for mapping
      const [empresasRes, funcionariosRes] = await Promise.all([
        supabase.from('empresas').select('id, nome').eq('active', true),
        supabase.from('funcionarios').select('id, cpf').eq('active', true).not('cpf', 'is', null),
      ]);
      
      const empresasMap = new Map(
        (empresasRes.data || []).map(e => [e.nome.toLowerCase(), e.id])
      );
      
      const funcionariosMap = new Map(
        (funcionariosRes.data || []).map(f => [normalizeCpf(f.cpf), f.id])
      );
      
      // Map rows
      const mapped = rawRows.map(row => mapRowToVeiculo(row, empresasMap, funcionariosMap));
      
      setPreviewData(mapped);
      setResult(null);
      
      const validCount = mapped.filter(r => r.status === 'valid').length;
      const warningCount = mapped.filter(r => r.status === 'warning').length;
      const errorCount = mapped.filter(r => r.status === 'error').length;
      
      toast.success(`${mapped.length} registros carregados: ${validCount} válidos, ${warningCount} avisos, ${errorCount} erros`);
    } catch (error: any) {
      toast.error("Erro ao processar arquivo: " + error.message);
    }
  };

  const processImport = async () => {
    if (previewData.length === 0) return;
    
    // Filter only valid and warning rows (skip errors)
    const toImport = previewData.filter(r => r.status !== 'error');
    
    if (toImport.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    
    const result: ImportResult = {
      total: toImport.length,
      created: 0,
      skipped: 0,
      errors: [],
    };
    
    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i];
      
      try {
        // Check if placa already exists
        const { data: existing } = await supabase
          .from('veiculos')
          .select('id')
          .eq('placa', row.placa)
          .eq('active', true)
          .maybeSingle();
        
        if (existing) {
          result.skipped++;
          result.errors.push(`Placa ${row.placa} já cadastrada`);
          setProgress(((i + 1) / toImport.length) * 100);
          continue;
        }
        
        // Prepare insert data with required types
        const insertData = {
          placa: row.placa,
          marca: row.marca,
          modelo: row.modelo,
          tipo: row.tipo || null,
          ano_fabricacao: row.ano_fabricacao || null,
          ano_modelo: row.ano_modelo || null,
          cor: row.cor || null,
          combustivel: row.combustivel || null,
          renavam: row.renavam || null,
          chassi: row.chassi || null,
          codigo_fipe: row.codigo_fipe || null,
          propriedade: row.proprietario?.toLowerCase() === 'particular' ? 'particular' : 'empresa',
          empresa_id: row.empresa_id,
          funcionario_id: row.funcionario_id,
          status: 'em_uso',
          active: true,
          // Licenciamento
          licenciamento_valor: row.licenciamento_valor || null,
          licenciamento_vencimento: row.licenciamento_vencimento || null,
          licenciamento_situacao: row.licenciamento_situacao || 'nao_pago',
          // IPVA
          ipva_valor: row.ipva_valor || null,
          ipva_vencimento: row.ipva_vencimento || null,
          ipva_situacao: row.ipva_situacao || 'nao_pago',
          // Seguro
          possui_seguro: !!(row.seguro_apolice || row.seguro_valor),
          seguro_apolice: row.seguro_apolice || null,
          seguro_valor: row.seguro_valor || null,
          seguro_vencimento: row.seguro_vencimento || null,
        };
        
        const { error } = await supabase.from('veiculos').insert(insertData);
        
        if (error) throw error;
        result.created++;
      } catch (error: any) {
        result.errors.push(`${row.placa}: ${error.message}`);
        result.skipped++;
      }
      
      setProgress(((i + 1) / toImport.length) * 100);
    }
    
    setResult(result);
    setIsProcessing(false);
    
    queryClient.invalidateQueries({ queryKey: ["veiculos"] });
    
    if (result.created > 0) {
      toast.success(`${result.created} veículos importados com sucesso!`);
    }
    if (result.skipped > 0) {
      toast.warning(`${result.skipped} veículos ignorados`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreviewData([]);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = previewData.filter(r => r.status === 'valid').length;
  const warningCount = previewData.filter(r => r.status === 'warning').length;
  const errorCount = previewData.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Veículos</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel para importar veículos em massa.
            A placa será usada como identificador único.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Info Section */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Formato esperado
            </p>
            <p className="text-xs text-muted-foreground">
              Colunas: PLACA, MARCA, MODELO, TIPO, ANO FABRICAÇÃO, ANO MODELO, COR, COMBUSTÍVEL, 
              PROPRIETÁRIO, EMPRESA, CPF CONDUTOR, LICENCIAMENTO, VENCIMENTO LICENCIAMENTO, 
              SITUAÇÃO LICENCIAMENTO, IPVA, VENCIMENTO IPVA, SITUAÇÃO IPVA, APÓLICE, VALOR SEGURO, 
              VENCIMENTO SEGURO
            </p>
          </div>
          
          <Separator />
          
          {/* File Input */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="veiculos-upload"
            />
            <label htmlFor="veiculos-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar um arquivo CSV ou Excel
              </p>
            </label>
          </div>
          
          {/* Summary */}
          {previewData.length > 0 && !result && (
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Resumo:</span>
              <Badge variant="default" className="bg-status-success text-status-success-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {validCount} válidos
              </Badge>
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-status-warning/20 text-status-warning">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {warningCount} avisos
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  {errorCount} erros
                </Badge>
              )}
            </div>
          )}
          
          {/* Preview Table */}
          {previewData.length > 0 && !result && (
            <div className="max-h-60 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Placa</th>
                    <th className="p-2 text-left">Marca</th>
                    <th className="p-2 text-left">Modelo</th>
                    <th className="p-2 text-left">Empresa</th>
                    <th className="p-2 text-left">Condutor</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className={`border-t ${row.status === 'error' ? 'bg-destructive/10' : row.status === 'warning' ? 'bg-status-warning/10' : ''}`}>
                      <td className="p-2 font-mono">{row.placa || '-'}</td>
                      <td className="p-2">{row.marca || '-'}</td>
                      <td className="p-2">{row.modelo || '-'}</td>
                      <td className="p-2">
                        {row.proprietario?.toLowerCase() === 'particular' 
                          ? 'Particular' 
                          : row.empresa_id 
                            ? <span className="text-status-success">✓</span> 
                            : <span className="text-status-warning">?</span>}
                      </td>
                      <td className="p-2">
                        {row.funcionario_id 
                          ? <span className="text-status-success">✓</span>
                          : row.condutor_cpf 
                            ? <span className="text-status-warning">?</span>
                            : '-'}
                      </td>
                      <td className="p-2">
                        {row.status === 'valid' && <span className="text-status-success">✓ OK</span>}
                        {row.status === 'warning' && (
                          <span className="text-status-warning" title={row.warnings.join(', ')}>⚠ Aviso</span>
                        )}
                        {row.status === 'error' && (
                          <span className="text-destructive" title={row.errors.join(', ')}>✗ {row.errors[0]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 20 && (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  ... e mais {previewData.length - 20} registros
                </p>
              )}
            </div>
          )}
          
          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importando... {Math.round(progress)}%
              </p>
            </div>
          )}
          
          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-status-success/10 text-status-success rounded-lg p-3 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.created}</p>
                  <p className="text-xs">Criados</p>
                </div>
                <div className="bg-status-warning/10 text-status-warning rounded-lg p-3 text-center">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.skipped}</p>
                  <p className="text-xs">Ignorados</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold">{result.total}</p>
                  <p className="text-xs">Total</p>
                </div>
              </div>
              
              {result.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Erros/Avisos ({result.errors.length})
                  </p>
                  <ul className="text-xs space-y-1">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li className="text-muted-foreground">... e mais {result.errors.length - 10}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {previewData.length > 0 && !result && (
            <Button onClick={processImport} disabled={isProcessing || (validCount + warningCount) === 0}>
              {isProcessing ? 'Importando...' : `Importar ${validCount + warningCount} veículos`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
