import { useState, useRef, useEffect } from "react";
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
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, UserMinus, Download, FileDown, Plus, RefreshCw, ArrowRight, AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { friendlyErrorMessage } from "@/lib/error-handler";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// CSV Template headers and example data
const CSV_HEADERS = ['CPF', 'NOME', 'EMAIL', 'TELEFONE', 'CARGO', 'DEPARTAMENTO', 'EMPRESA', 'ATIVO', 'CODIGO_VENDEDOR'];
const CSV_EXAMPLE_ROWS = [
  ['12345678901', 'Maria da Silva', 'maria@email.com', '11999999999', 'Analista', 'Financeiro', 'Empresa ABC', 'Ativo', ''],
  ['98765432100', 'João Santos', 'joao@email.com', '11988888888', 'Gerente', 'TI', 'Empresa XYZ', 'Ativo', '123'],
];

// Generate and download CSV file
const downloadCsv = (content: string, filename: string) => {
  // BOM for UTF-8 Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Download empty template with example rows
const downloadTemplate = () => {
  const csvContent = [
    CSV_HEADERS.join(';'),
    ...CSV_EXAMPLE_ROWS.map(row => row.join(';'))
  ].join('\n');
  
  downloadCsv(csvContent, 'modelo_funcionarios.csv');
  toast.success('Modelo CSV baixado!');
};

// Export current employees
const exportFuncionarios = async () => {
  try {
    const { data, error } = await supabase
      .from('funcionarios')
      .select(`
        cpf, nome, email, telefone, cargo, departamento, codigo_vendedor,
        empresa:empresas!funcionarios_empresa_id_fkey(nome)
      `)
      .eq('active', true)
      .order('nome');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      toast.warning('Não há funcionários ativos para exportar');
      return;
    }
    
    const rows = data.map(f => [
      f.cpf || '',
      f.nome || '',
      f.email || '',
      f.telefone || '',
      f.cargo || '',
      f.departamento || '',
      (f.empresa as any)?.nome || '',
      'Ativo',
      (f as any).codigo_vendedor || ''
    ].join(';'));
    
    const csvContent = [CSV_HEADERS.join(';'), ...rows].join('\n');
    downloadCsv(csvContent, `funcionarios_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${data.length} funcionários exportados!`);
  } catch (error: any) {
    toast.error(friendlyErrorMessage('exportar funcionários', error));
  }
};

interface ImportResult {
  total: number;
  updated: number;
  created: number;
  skipped: number;
  deactivated: number;
  reactivated: number;
  assetsReleased: number;
  errors: string[];
}

interface CsvRow {
  cpf: string;
  nome?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  empresa?: string;
  equipe?: string;
  ativo?: string;
  is_condutor?: string;
  cnh_numero?: string;
  cnh_categoria?: string;
  cnh_validade?: string;
  codigo_vendedor?: string;
}

// Normalize CPF: remove non-digits and pad to 11 digits with leading zeros
const normalizeCpf = (cpf: string) => {
  const digits = cpf?.replace(/\D/g, '') || '';
  if (!digits) return '';
  return digits.padStart(11, '0');
};

interface ConsolidationInfo {
  originalCount: number;
  uniqueCount: number;
  duplicatesConsolidated: number;
}

// Field change info for preview
interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

// Preview record with action type
interface PreviewRecord {
  cpf: string;
  nome: string;
  action: 'insert' | 'update' | 'deactivate' | 'skip' | 'reactivate';
  changes?: FieldChange[];
  row: CsvRow;
  existingData?: Record<string, any>;
}

// Employee to be deactivated (for full-sync mode)
interface EmployeeToDeactivate {
  id: string;
  cpf: string;
  nome: string;
}

// Consolidate duplicate CPFs before processing
const consolidateByCpf = (rows: CsvRow[]): { consolidated: CsvRow[], info: ConsolidationInfo } => {
  const cpfMap = new Map<string, CsvRow[]>();
  
  // Group all rows by normalized CPF
  rows.forEach(row => {
    const cpf = normalizeCpf(row.cpf);
    if (!cpf || cpf.length !== 11) return;
    
    if (!cpfMap.has(cpf)) {
      cpfMap.set(cpf, []);
    }
    cpfMap.get(cpf)!.push(row);
  });
  
  // Consolidate each CPF group
  const consolidated: CsvRow[] = [];
  
  cpfMap.forEach((cpfRows) => {
    // Check if ANY record is active
    const hasActiveRecord = cpfRows.some(row => {
      if (!row.ativo) return true; // No status = assume active
      const ativoLower = row.ativo.toLowerCase();
      return ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
    });
    
    // Use the first active record, or the first record if all inactive
    const baseRow = cpfRows.find(row => {
      if (!row.ativo) return true;
      const ativoLower = row.ativo.toLowerCase();
      return ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
    }) || cpfRows[0];
    
    // Create consolidated record
    const consolidatedRow: CsvRow = {
      ...baseRow,
      ativo: hasActiveRecord ? 'Ativo' : 'Inativo',
    };
    
    consolidated.push(consolidatedRow);
  });
  
  const info: ConsolidationInfo = {
    originalCount: rows.length,
    uniqueCount: consolidated.length,
    duplicatesConsolidated: rows.length - consolidated.length,
  };
  
  return { consolidated, info };
};

// CSV line parser - handles special format with ',' as delimiter
const parseCSVLine = (line: string): string[] => {
  // Check if line uses ',' as delimiter pattern (common in some exports)
  if (line.includes("','")) {
    const parts = line.split("','");
    return parts.map((v, idx) => {
      let cleaned = v.trim();
      if (idx === parts.length - 1) {
        cleaned = cleaned.replace(/'$/, '');
      }
      cleaned = cleaned.replace(/^['"]|['"]$/g, '');
      return cleaned.trim();
    });
  }
  
  // Standard CSV parsing with quote awareness
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if ((char === '"' || char === "'") && (!inQuotes || char === quoteChar)) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else {
        inQuotes = false;
        quoteChar = '';
      }
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result.map(v => v.replace(/^['"]|['"]$/g, ''));
};

// Header mapping to normalize different column names
const headerMappings: Record<string, keyof CsvRow> = {
  // CPF
  'cpf': 'cpf',
  'cpffuncionario': 'cpf',
  'cpf_funcionario': 'cpf',
  
  // Nome
  'nome': 'nome',
  'nomefuncionario': 'nome',
  'nome_funcionario': 'nome',
  'funcionario': 'nome',
  
  // Email
  'email': 'email',
  'e_mail': 'email',
  'emailfuncionario': 'email',
  
  // Telefone
  'telefone': 'telefone',
  'tel': 'telefone',
  'celular': 'telefone',
  
  // Cargo
  'cargo': 'cargo',
  'descricaocargo': 'cargo',
  'descricao_cargo': 'cargo',
  'funcao': 'cargo',
  'posicao': 'cargo',
  
  // Departamento
  'departamento': 'departamento',
  'centrodecusto': 'departamento',
  'centro_de_custo': 'departamento',
  'depto': 'departamento',
  'setor': 'departamento',
  
  // Empresa
  'empresa': 'empresa',
  'empresa_nome': 'empresa',
  'companhia': 'empresa',
  
  // Equipe
  'equipe': 'equipe',
  'time': 'equipe',
  'grupo': 'equipe',
  
  // Status/Ativo
  'ativo': 'ativo',
  'situacao': 'ativo',
  'status': 'ativo',
  
  // Condutor
  'is_condutor': 'is_condutor',
  'condutor': 'is_condutor',
  'motorista': 'is_condutor',
  
  // CNH
  'cnh_numero': 'cnh_numero',
  'cnh': 'cnh_numero',
  'cnh_categoria': 'cnh_categoria',
  'categoria_cnh': 'cnh_categoria',
  'cnh_validade': 'cnh_validade',
  'validade_cnh': 'cnh_validade',
  
  // Código do Vendedor
  'codigo_vendedor': 'codigo_vendedor',
  'codigovendedor': 'codigo_vendedor',
  'cod_vendedor': 'codigo_vendedor',
  'codvendedor': 'codigo_vendedor',
};

// Parse CSV with fixed column positions (no header)
const parseWithFixedColumns = (lines: string[]): CsvRow[] => {
  const rows: CsvRow[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    if (values.length < 2) continue;
    
    const row: CsvRow = {
      nome: values[0] || '',
      cpf: values[1] || '',
      cargo: values[2] || '',
      departamento: values[3] || '',
      empresa: values[4] || '',
      ativo: values[5] || 'Ativo',
      email: '',
      telefone: '',
      equipe: '',
      is_condutor: '',
      cnh_numero: '',
      cnh_categoria: '',
      cnh_validade: '',
      codigo_vendedor: '',
    };
    
    if (row.cpf) {
      rows.push(row);
    }
  }
  
  return rows;
};

// Parse CSV with header mapping
const parseWithHeader = (lines: string[], headerLineIndex: number): CsvRow[] => {
  const headerLine = lines[headerLineIndex];
  const rawHeaders = parseCSVLine(headerLine);
  
  const headers = rawHeaders.map(h => {
    const normalized = h.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/['"]/g, '');
    return normalized;
  });
  
  const rows: CsvRow[] = [];
  
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    const mappedRow: CsvRow = {
      cpf: '',
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      departamento: '',
      empresa: '',
      equipe: '',
      ativo: '',
      is_condutor: '',
      cnh_numero: '',
      cnh_categoria: '',
      cnh_validade: '',
      codigo_vendedor: '',
    };
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      let targetField = headerMappings[header];
      
      if (!targetField) {
        const headerNoUnderscore = header.replace(/_/g, '');
        targetField = headerMappings[headerNoUnderscore];
      }
      
      if (targetField) {
        mappedRow[targetField] = value;
      }
    });
    
    if (mappedRow.cpf) {
      rows.push(mappedRow);
    }
  }
  
  return rows;
};

const parseCsv = (text: string): CsvRow[] => {
  const lines = text.trim().split('\n');
  if (lines.length < 1) return [];
  
  const firstLine = lines[0];
  const firstValues = parseCSVLine(firstLine);
  
  const looksLikeHeader = firstValues.some(v => {
    const lower = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return ['cpf', 'nome', 'cargo', 'empresa', 'situacao', 'ativo', 'funcionario', 
            'centro', 'departamento', 'email', 'telefone'].some(h => lower.includes(h));
  });
  
  if (looksLikeHeader) {
    let headerLineIndex = 0;
    if (firstLine.startsWith("'") || firstLine.includes("\"'") || firstLine.includes("'\"")) {
      headerLineIndex = 1;
      if (lines.length < 3) return [];
    }
    return parseWithHeader(lines, headerLineIndex);
  } else {
    return parseWithFixedColumns(lines);
  }
};

// Helper function to release assets from a deactivated employee
const releaseAssetsFromFuncionario = async (funcionarioId: string) => {
  let releasedCount = 0;

  const { data: assets } = await supabase
    .from('assets')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('active', true);

  if (assets && assets.length > 0) {
    await supabase
      .from('assets')
      .update({ funcionario_id: null, status: 'disponivel' })
      .eq('funcionario_id', funcionarioId);
    releasedCount += assets.length;
  }

  const { data: linhas } = await supabase
    .from('linhas_telefonicas')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('active', true);

  if (linhas && linhas.length > 0) {
    await supabase
      .from('linhas_telefonicas')
      .update({ funcionario_id: null })
      .eq('funcionario_id', funcionarioId);
    releasedCount += linhas.length;
  }

  const { data: veiculos } = await supabase
    .from('veiculos')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('active', true);

  if (veiculos && veiculos.length > 0) {
    await supabase
      .from('veiculos')
      .update({ funcionario_id: null, status: 'disponivel' })
      .eq('funcionario_id', funcionarioId);
    releasedCount += veiculos.length;
  }

  return releasedCount;
};

// Field labels for display
const fieldLabels: Record<string, string> = {
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  cargo: 'Cargo',
  departamento: 'Departamento',
  empresa_id: 'Empresa',
  equipe_id: 'Equipe',
  is_condutor: 'Condutor',
  cnh_numero: 'CNH Número',
  cnh_categoria: 'CNH Categoria',
  cnh_validade: 'CNH Validade',
  is_vendedor: 'Vendedor',
  codigo_vendedor: 'Cód. Vendedor',
};

type ImportMode = 'update-only' | 'full-sync';

export function ImportFuncionariosDialog() {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([]);
  const [consolidationInfo, setConsolidationInfo] = useState<ConsolidationInfo | null>(null);
  const [empresasMap, setEmpresasMap] = useState<Map<string, { id: string, nome: string }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // NEW: Import mode state
  const [importMode, setImportMode] = useState<ImportMode>('update-only');
  const [toDeactivateList, setToDeactivateList] = useState<EmployeeToDeactivate[]>([]);

  // Analyze CSV and compare with existing data
  const analyzePreview = async (rows: CsvRow[], mode: ImportMode) => {
    setIsAnalyzing(true);
    
    try {
      // Fetch empresas for name matching and display
      const [empresasRes, equipesRes] = await Promise.all([
        supabase.from('empresas').select('id, nome').eq('active', true),
        supabase.from('equipes').select('id, nome').eq('active', true),
      ]);
      
      const empresasMapLocal = new Map(
        (empresasRes.data || []).map(e => [e.nome.toLowerCase(), { id: e.id, nome: e.nome }])
      );
      const empresasIdMap = new Map(
        (empresasRes.data || []).map(e => [e.id, e.nome])
      );
      setEmpresasMap(empresasMapLocal);
      
      const equipesMap = new Map(
        (equipesRes.data || []).map(e => [e.nome.toLowerCase(), e.id])
      );
      
      // Get all CPFs from the CSV
      const cpfList = rows
        .map(r => normalizeCpf(r.cpf))
        .filter(cpf => cpf && cpf.length === 11);
      
      const csvCpfsSet = new Set(cpfList);
      
      // Fetch existing employees by CPF (both active and inactive for reactivation detection)
      const { data: existingEmployees } = await supabase
        .from('funcionarios')
        .select('id, cpf, nome, email, telefone, cargo, departamento, empresa_id, equipe_id, is_condutor, cnh_numero, cnh_categoria, cnh_validade, is_vendedor, codigo_vendedor, active')
        .in('cpf', cpfList);
      
      const existingMap = new Map(
        (existingEmployees || []).map(e => [e.cpf, e])
      );
      
      // FULL-SYNC: Fetch all active employees to identify who will be deactivated
      let willDeactivate: EmployeeToDeactivate[] = [];
      if (mode === 'full-sync') {
        const { data: allActiveEmployees } = await supabase
          .from('funcionarios')
          .select('id, cpf, nome')
          .eq('active', true)
          .not('cpf', 'is', null)
          .neq('cpf', '');
        
        willDeactivate = (allActiveEmployees || []).filter(emp => {
          const normalizedCpf = normalizeCpf(emp.cpf || '');
          return normalizedCpf && !csvCpfsSet.has(normalizedCpf);
        }).map(emp => ({
          id: emp.id,
          cpf: emp.cpf || '',
          nome: emp.nome || 'Sem nome',
        }));
      }
      setToDeactivateList(willDeactivate);
      
      // Analyze each row
      const records: PreviewRecord[] = [];
      
      for (const row of rows) {
        const cpf = normalizeCpf(row.cpf);
        
        if (!cpf || cpf.length !== 11) {
          records.push({
            cpf: row.cpf,
            nome: row.nome || '-',
            action: 'skip',
            row,
          });
          continue;
        }
        
        // Determine if CSV marks this as inactive
        let isActiveInCsv = true;
        if (row.ativo) {
          const ativoLower = row.ativo.toLowerCase();
          isActiveInCsv = ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
        }
        
        const existing = existingMap.get(cpf);
        
        if (!isActiveInCsv) {
          if (existing) {
            records.push({
              cpf,
              nome: existing.nome || row.nome || '-',
              action: 'deactivate',
              row,
              existingData: existing,
            });
          } else {
            records.push({
              cpf,
              nome: row.nome || '-',
              action: 'skip',
              row,
            });
          }
          continue;
        }
        
        if (existing) {
          // Check if employee is currently inactive - will be reactivated
          const isReactivation = existing.active === false;
          
          // Compare fields to find changes
          const changes: FieldChange[] = [];
          
          // Nome
          if (row.nome && row.nome.toUpperCase() !== (existing.nome || '').toUpperCase()) {
            changes.push({ field: 'nome', oldValue: existing.nome || '', newValue: row.nome.toUpperCase() });
          }
          
          // Email
          if (row.email && row.email.toLowerCase() !== (existing.email || '').toLowerCase()) {
            changes.push({ field: 'email', oldValue: existing.email || '', newValue: row.email.toLowerCase() });
          }
          
          // Telefone
          if (row.telefone && row.telefone !== (existing.telefone || '')) {
            changes.push({ field: 'telefone', oldValue: existing.telefone || '', newValue: row.telefone });
          }
          
          // Cargo
          if (row.cargo && row.cargo.toUpperCase() !== (existing.cargo || '').toUpperCase()) {
            changes.push({ field: 'cargo', oldValue: existing.cargo || '', newValue: row.cargo.toUpperCase() });
          }
          
          // Departamento
          if (row.departamento && row.departamento.toUpperCase() !== (existing.departamento || '').toUpperCase()) {
            changes.push({ field: 'departamento', oldValue: existing.departamento || '', newValue: row.departamento.toUpperCase() });
          }
          
          // Empresa
          if (row.empresa) {
            const empresaAliases: Record<string, string> = {
              'cdf com de produtos alimenticios ltda': 'chokdoce loja 2',
              'jjgf com de produtos alimenticios ltda': 'chokdoce loja 3',
            };
            const empresaNormalizada = row.empresa.toLowerCase();
            const empresaNomeFinal = empresaAliases[empresaNormalizada] || empresaNormalizada;
            const empresaInfo = empresasMapLocal.get(empresaNomeFinal);
            if (empresaInfo && empresaInfo.id !== existing.empresa_id) {
              const oldEmpresa = existing.empresa_id ? empresasIdMap.get(existing.empresa_id) || '' : '';
              changes.push({ field: 'empresa_id', oldValue: oldEmpresa, newValue: empresaInfo.nome });
            }
          }
          
          // Código do vendedor
          if (row.codigo_vendedor) {
            const codigo = row.codigo_vendedor.replace(/\D/g, '');
            if (codigo && codigo !== (existing.codigo_vendedor || '')) {
              changes.push({ field: 'codigo_vendedor', oldValue: existing.codigo_vendedor || '', newValue: codigo });
              if (!existing.is_vendedor) {
                changes.push({ field: 'is_vendedor', oldValue: 'Não', newValue: 'Sim' });
              }
            }
          }
          
          records.push({
            cpf,
            nome: row.nome?.toUpperCase() || existing.nome || '-',
            action: isReactivation ? 'reactivate' : 'update',
            changes: changes.length > 0 ? changes : undefined,
            row,
            existingData: existing,
          });
        } else {
          // New record
          records.push({
            cpf,
            nome: row.nome?.toUpperCase() || 'SEM NOME',
            action: 'insert',
            row,
          });
        }
      }
      
      setPreviewRecords(records);
    } catch (error) {
      console.error('Error analyzing preview:', error);
      toast.error('Erro ao analisar prévia');
    }
    
    setIsAnalyzing(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      
      if (rows.length === 0) {
        toast.error("Arquivo CSV vazio ou formato inválido");
        return;
      }
      
      // Consolidate duplicate CPFs before processing
      const { consolidated, info } = consolidateByCpf(rows);
      
      setPreviewData(consolidated);
      setConsolidationInfo(info);
      setResult(null);
      setPreviewRecords([]);
      setToDeactivateList([]);
      
      // Analyze and compare with existing data
      await analyzePreview(consolidated, importMode);
    } catch (error) {
      toast.error("Erro ao ler arquivo CSV");
    }
  };

  // Re-analyze when import mode changes
  const handleImportModeChange = async (mode: ImportMode) => {
    setImportMode(mode);
    if (previewData.length > 0) {
      await analyzePreview(previewData, mode);
    }
  };

  const processImport = async () => {
    if (previewData.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    const result: ImportResult = {
      total: previewData.length,
      updated: 0,
      created: 0,
      skipped: 0,
      deactivated: 0,
      reactivated: 0,
      assetsReleased: 0,
      errors: [],
    };
    
    // Fetch all empresas and equipes for name matching
    const [empresasRes, equipesRes] = await Promise.all([
      supabase.from('empresas').select('id, nome').eq('active', true),
      supabase.from('equipes').select('id, nome').eq('active', true),
    ]);
    
    const empresasMapLocal = new Map(
      (empresasRes.data || []).map(e => [e.nome.toLowerCase(), e.id])
    );
    const equipesMapLocal = new Map(
      (equipesRes.data || []).map(e => [e.nome.toLowerCase(), e.id])
    );
    
    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      const cpf = normalizeCpf(row.cpf);
      
      if (!cpf || cpf.length !== 11) {
        result.errors.push(`Linha ${i + 2}: CPF inválido "${row.cpf}"`);
        result.skipped++;
        setProgress(((i + 1) / previewData.length) * 100);
        continue;
      }
      
      try {
        // Check if funcionario exists by CPF (include inactive for reactivation)
        const { data: existing } = await supabase
          .from('funcionarios')
          .select('id, active')
          .eq('cpf', cpf)
          .maybeSingle();
        
        // Determine if CSV marks this employee as inactive
        let isActiveInCsv = true;
        if (row.ativo) {
          const ativoLower = row.ativo.toLowerCase();
          isActiveInCsv = ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
        }
        
        // Handle inactive employee logic
        if (!isActiveInCsv) {
          if (existing) {
            const { error } = await supabase
              .from('funcionarios')
              .update({ active: false })
              .eq('id', existing.id);
            
            if (error) throw error;
            
            const releasedCount = await releaseAssetsFromFuncionario(existing.id);
            result.deactivated++;
            result.assetsReleased += releasedCount;
          } else {
            result.skipped++;
          }
          setProgress(((i + 1) / previewData.length) * 100);
          continue;
        }
        
        // Prepare update data for active employees
        const updateData: Record<string, any> = {};
        
        if (row.nome) updateData.nome = row.nome.toUpperCase();
        if (row.email) updateData.email = row.email.toLowerCase();
        if (row.telefone) updateData.telefone = row.telefone;
        if (row.cargo) updateData.cargo = row.cargo.toUpperCase();
        if (row.departamento) updateData.departamento = row.departamento.toUpperCase();
        
        // Match empresa by name
        if (row.empresa) {
          const empresaAliases: Record<string, string> = {
            'cdf com de produtos alimenticios ltda': 'chokdoce loja 2',
            'jjgf com de produtos alimenticios ltda': 'chokdoce loja 3',
          };
          const empresaNormalizada = row.empresa.toLowerCase();
          const empresaNomeFinal = empresaAliases[empresaNormalizada] || empresaNormalizada;
          const empresaId = empresasMapLocal.get(empresaNomeFinal);
          if (empresaId) updateData.empresa_id = empresaId;
        }
        
        // Match equipe by name
        if (row.equipe) {
          const equipeId = equipesMapLocal.get(row.equipe.toLowerCase());
          if (equipeId) updateData.equipe_id = equipeId;
        }
        
        // ALWAYS force active = true for records in CSV marked as active
        updateData.active = true;
        
        // Parse is_condutor
        if (row.is_condutor) {
          const condutorLower = row.is_condutor.toLowerCase();
          updateData.is_condutor = ['sim', 'yes', 'true', '1', 's'].includes(condutorLower);
        }
        
        // CNH fields
        if (row.cnh_numero) updateData.cnh_numero = row.cnh_numero;
        if (row.cnh_categoria) updateData.cnh_categoria = row.cnh_categoria.toUpperCase();
        if (row.cnh_validade) updateData.cnh_validade = row.cnh_validade;
        
        // Código do vendedor - se preenchido, ativa is_vendedor
        if (row.codigo_vendedor) {
          const codigo = row.codigo_vendedor.replace(/\D/g, '');
          if (codigo) {
            updateData.is_vendedor = true;
            updateData.codigo_vendedor = codigo;
          }
        }
        
        if (existing) {
          const wasInactive = existing.active === false;
          
          const { error } = await supabase
            .from('funcionarios')
            .update(updateData)
            .eq('id', existing.id);
          
          if (error) throw error;
          
          // Count reactivations separately
          if (wasInactive) {
            result.reactivated++;
          } else {
            result.updated++;
          }
        } else {
          const { error } = await supabase
            .from('funcionarios')
            .insert({
              cpf,
              nome: row.nome?.toUpperCase() || 'SEM NOME',
              ...updateData,
            });
          
          if (error) throw error;
          result.created++;
        }
      } catch (error: any) {
        result.errors.push(`Linha ${i + 2}: ${error.message}`);
        result.skipped++;
      }
      
      setProgress(((i + 1) / previewData.length) * 100);
    }
    
    // STEP 2: Deactivate employees ONLY if full-sync mode is selected
    if (importMode === 'full-sync') {
      const importedCpfs = new Set<string>();
      previewData.forEach(row => {
        const cpf = normalizeCpf(row.cpf);
        if (cpf && cpf.length === 11) {
          importedCpfs.add(cpf);
        }
      });
      
      const { data: activeEmployees } = await supabase
        .from('funcionarios')
        .select('id, cpf, nome')
        .eq('active', true)
        .not('cpf', 'is', null)
        .neq('cpf', '');
      
      if (activeEmployees && activeEmployees.length > 0) {
        const toDeactivate = activeEmployees.filter(emp => {
          const normalizedCpf = normalizeCpf(emp.cpf || '');
          return normalizedCpf && !importedCpfs.has(normalizedCpf);
        });
        
        for (const emp of toDeactivate) {
          try {
            await supabase
              .from('funcionarios')
              .update({ active: false })
              .eq('id', emp.id);
            
            const releasedCount = await releaseAssetsFromFuncionario(emp.id);
            result.deactivated++;
            result.assetsReleased += releasedCount;
          } catch (error: any) {
            result.errors.push(`Erro ao desativar ${emp.nome}: ${error.message}`);
          }
        }
      }
    }
    
    setResult(result);
    setIsProcessing(false);
    
    // Invalidate all related queries
    queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
    queryClient.invalidateQueries({ queryKey: ["ativos"] });
    queryClient.invalidateQueries({ queryKey: ["linhas-telefonicas"] });
    queryClient.invalidateQueries({ queryKey: ["veiculos"] });
    
    if (result.errors.length === 0) {
      const parts = [];
      if (result.updated > 0) parts.push(`${result.updated} atualizados`);
      if (result.created > 0) parts.push(`${result.created} criados`);
      if (result.reactivated > 0) parts.push(`${result.reactivated} reativados`);
      if (result.deactivated > 0) parts.push(`${result.deactivated} inativados`);
      toast.success(`Importação concluída: ${parts.join(', ')}`);
    } else {
      toast.warning(`Importação concluída com ${result.errors.length} erros`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreviewData([]);
    setPreviewRecords([]);
    setConsolidationInfo(null);
    setResult(null);
    setProgress(0);
    setImportMode('update-only');
    setToDeactivateList([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Count records by action
  const insertCount = previewRecords.filter(r => r.action === 'insert').length;
  const updateCount = previewRecords.filter(r => r.action === 'update').length;
  const reactivateCount = previewRecords.filter(r => r.action === 'reactivate').length;
  const updateWithChangesCount = previewRecords.filter(r => (r.action === 'update' || r.action === 'reactivate') && r.changes && r.changes.length > 0).length;
  const deactivateCount = previewRecords.filter(r => r.action === 'deactivate').length;
  const skipCount = previewRecords.filter(r => r.action === 'skip').length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Funcionários via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV para atualizar os dados dos funcionários.
            O CPF será usado como identificador único.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Download Template Section */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Baixar Modelo CSV
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileDown className="h-4 w-4 mr-2" />
                Modelo Vazio
              </Button>
              <Button variant="outline" size="sm" onClick={exportFuncionarios}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Atuais
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Formato: CPF;NOME;EMAIL;TELEFONE;CARGO;DEPARTAMENTO;EMPRESA;ATIVO;CODIGO_VENDEDOR
            </p>
          </div>
          
          <Separator />
          
          {/* Import Mode Selector */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <Label className="text-sm font-medium flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Modo de Importação
            </Label>
            <RadioGroup 
              value={importMode} 
              onValueChange={(value) => handleImportModeChange(value as ImportMode)} 
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="update-only" id="update-only" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="update-only" className="font-medium cursor-pointer">
                    Apenas Atualizar/Inserir (Recomendado)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Processa apenas os registros do CSV. Funcionários que não estão 
                    na planilha <span className="font-medium">permanecem inalterados</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="full-sync" id="full-sync" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="full-sync" className="font-medium text-destructive cursor-pointer">
                    Sincronização Total (Cuidado!)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Funcionários que não estão na planilha serão <span className="font-medium text-destructive">INATIVADOS</span> e 
                    seus ativos serão liberados.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <Separator />
          
          {/* File Input */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar um arquivo CSV
              </p>
            </label>
          </div>
          
          {/* Analyzing indicator */}
          {isAnalyzing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Analisando arquivo...</span>
            </div>
          )}
          
          {/* FULL-SYNC WARNING: Show employees that will be deactivated */}
          {importMode === 'full-sync' && toDeactivateList.length > 0 && !result && !isAnalyzing && (
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-base">
                ATENÇÃO: {toDeactivateList.length} funcionários serão INATIVADOS!
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Estes funcionários não constam na planilha e serão desativados, 
                  liberando todos os ativos vinculados:
                </p>
                <ScrollArea className="h-[120px] border rounded bg-destructive/5 p-2">
                  <ul className="text-xs space-y-1">
                    {toDeactivateList.map(emp => (
                      <li key={emp.id} className="flex justify-between">
                        <span>{emp.nome}</span>
                        <span className="font-mono text-muted-foreground">{emp.cpf}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Preview with Tabs */}
          {previewRecords.length > 0 && !result && !isAnalyzing && (
            <div className="space-y-3">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2">
                {consolidationInfo && consolidationInfo.duplicatesConsolidated > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {consolidationInfo.duplicatesConsolidated} CPFs duplicados consolidados
                  </Badge>
                )}
                <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                  <Plus className="h-3 w-3 mr-1" />
                  {insertCount} novos
                </Badge>
                <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {updateCount} existentes ({updateWithChangesCount} com alterações)
                </Badge>
                {reactivateCount > 0 && (
                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {reactivateCount} a reativar
                  </Badge>
                )}
                {deactivateCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                    <UserMinus className="h-3 w-3 mr-1" />
                    {deactivateCount} a inativar (CSV)
                  </Badge>
                )}
                {importMode === 'full-sync' && toDeactivateList.length > 0 && (
                  <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {toDeactivateList.length} ausentes (serão inativados)
                  </Badge>
                )}
                {skipCount > 0 && (
                  <Badge variant="outline">
                    {skipCount} ignorados
                  </Badge>
                )}
              </div>
              
              {/* Tabbed Preview */}
              <Tabs defaultValue="insert" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="insert" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Novos ({insertCount})
                  </TabsTrigger>
                  <TabsTrigger value="update" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Atualizar ({updateCount + reactivateCount})
                  </TabsTrigger>
                  <TabsTrigger value="other" className="text-xs">
                    Outros ({deactivateCount + skipCount})
                  </TabsTrigger>
                  {importMode === 'full-sync' && (
                    <TabsTrigger value="missing" className="text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Ausentes ({toDeactivateList.length})
                    </TabsTrigger>
                  )}
                </TabsList>
                
                {/* New Records Tab */}
                <TabsContent value="insert" className="mt-2">
                  <ScrollArea className="h-[200px] border rounded">
                    {insertCount === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum novo funcionário para inserir
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">CPF</th>
                            <th className="p-2 text-left">Nome</th>
                            <th className="p-2 text-left">Cargo</th>
                            <th className="p-2 text-left">Empresa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRecords
                            .filter(r => r.action === 'insert')
                            .map((record, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2 font-mono">{record.cpf}</td>
                                <td className="p-2">{record.row.nome || '-'}</td>
                                <td className="p-2">{record.row.cargo || '-'}</td>
                                <td className="p-2">{record.row.empresa || '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                {/* Update Records Tab */}
                <TabsContent value="update" className="mt-2">
                  <ScrollArea className="h-[200px] border rounded">
                    {updateCount + reactivateCount === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum funcionário existente para atualizar
                      </p>
                    ) : (
                      <div className="divide-y">
                        {previewRecords
                          .filter(r => r.action === 'update' || r.action === 'reactivate')
                          .map((record, idx) => (
                            <div key={idx} className="p-3 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{record.nome}</span>
                                  {record.action === 'reactivate' && (
                                    <Badge className="bg-green-500/10 text-green-600 text-[10px]">
                                      <RotateCcw className="h-2.5 w-2.5 mr-1" />
                                      Será reativado
                                    </Badge>
                                  )}
                                </div>
                                <span className="font-mono text-muted-foreground">{record.cpf}</span>
                              </div>
                              {record.changes && record.changes.length > 0 ? (
                                <div className="space-y-1 mt-2">
                                  {record.changes.map((change, cIdx) => (
                                    <div key={cIdx} className="flex items-center gap-2 text-[11px] bg-amber-500/5 rounded px-2 py-1">
                                      <span className="font-medium text-muted-foreground w-24 shrink-0">
                                        {fieldLabels[change.field] || change.field}:
                                      </span>
                                      <span className="text-destructive line-through truncate max-w-[100px]" title={change.oldValue}>
                                        {change.oldValue || '(vazio)'}
                                      </span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="text-green-600 font-medium truncate max-w-[100px]" title={change.newValue}>
                                        {change.newValue}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground italic">
                                  {record.action === 'reactivate' ? 'Será reativado (sem outras alterações)' : 'Sem alterações detectadas'}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                {/* Other (Deactivate/Skip) Tab */}
                <TabsContent value="other" className="mt-2">
                  <ScrollArea className="h-[200px] border rounded">
                    {deactivateCount + skipCount === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum registro para inativar ou ignorar
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">CPF</th>
                            <th className="p-2 text-left">Nome</th>
                            <th className="p-2 text-left">Ação</th>
                            <th className="p-2 text-left">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRecords
                            .filter(r => r.action === 'deactivate' || r.action === 'skip')
                            .map((record, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2 font-mono">{record.cpf}</td>
                                <td className="p-2">{record.nome}</td>
                                <td className="p-2">
                                  {record.action === 'deactivate' ? (
                                    <Badge variant="destructive" className="text-[10px]">Inativar</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">Ignorar</Badge>
                                  )}
                                </td>
                                <td className="p-2 text-muted-foreground">
                                  {record.action === 'deactivate' 
                                    ? 'Marcado como inativo no CSV' 
                                    : 'CPF inválido ou registro não existente'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                {/* Missing Employees Tab (Full-Sync Only) */}
                {importMode === 'full-sync' && (
                  <TabsContent value="missing" className="mt-2">
                    <ScrollArea className="h-[200px] border border-destructive/50 rounded bg-destructive/5">
                      {toDeactivateList.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          Todos os funcionários ativos estão na planilha
                        </p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="bg-destructive/10 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">CPF</th>
                              <th className="p-2 text-left">Nome</th>
                              <th className="p-2 text-left">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {toDeactivateList.map((emp, idx) => (
                              <tr key={idx} className="border-t border-destructive/20">
                                <td className="p-2 font-mono">{emp.cpf}</td>
                                <td className="p-2">{emp.nome}</td>
                                <td className="p-2">
                                  <Badge variant="destructive" className="text-[10px]">
                                    Será inativado
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </ScrollArea>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
          
          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processando... {Math.round(progress)}%
              </p>
            </div>
          )}
          
          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-green-500/10 text-green-600 rounded-lg p-3 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.updated}</p>
                  <p className="text-xs">Atualizados</p>
                </div>
                <div className="bg-blue-500/10 text-blue-600 rounded-lg p-3 text-center">
                  <Plus className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.created}</p>
                  <p className="text-xs">Criados</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-600 rounded-lg p-3 text-center">
                  <RotateCcw className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.reactivated}</p>
                  <p className="text-xs">Reativados</p>
                </div>
                <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-center">
                  <UserMinus className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.deactivated}</p>
                  <p className="text-xs">Inativados</p>
                  {result.assetsReleased > 0 && (
                    <p className="text-[10px] opacity-75">({result.assetsReleased} ativos liberados)</p>
                  )}
                </div>
                <div className="bg-amber-500/10 text-amber-600 rounded-lg p-3 text-center">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.skipped}</p>
                  <p className="text-xs">Ignorados</p>
                </div>
              </div>
              
              {result.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Erros ({result.errors.length})
                  </p>
                  <ul className="text-xs space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {previewRecords.length > 0 && !result && !isAnalyzing && (
            <Button 
              onClick={processImport} 
              disabled={isProcessing}
              variant={importMode === 'full-sync' && toDeactivateList.length > 0 ? 'destructive' : 'default'}
            >
              {isProcessing ? 'Processando...' : `Importar ${previewData.length} registros`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
