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
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, UserMinus, Download, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

// CSV Template headers and example data
const CSV_HEADERS = ['CPF', 'NOME', 'EMAIL', 'TELEFONE', 'CARGO', 'DEPARTAMENTO', 'EMPRESA', 'ATIVO'];
const CSV_EXAMPLE_ROWS = [
  ['12345678901', 'Maria da Silva', 'maria@email.com', '11999999999', 'Analista', 'Financeiro', 'Empresa ABC', 'Ativo'],
  ['98765432100', 'João Santos', 'joao@email.com', '11988888888', 'Gerente', 'TI', 'Empresa XYZ', 'Ativo'],
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
        cpf, nome, email, telefone, cargo, departamento,
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
      'Ativo'
    ].join(';'));
    
    const csvContent = [CSV_HEADERS.join(';'), ...rows].join('\n');
    downloadCsv(csvContent, `funcionarios_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${data.length} funcionários exportados!`);
  } catch (error: any) {
    toast.error('Erro ao exportar: ' + error.message);
  }
};

interface ImportResult {
  total: number;
  updated: number;
  created: number;
  skipped: number;
  deactivated: number;
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

// Consolidate duplicate CPFs before processing
// If ANY record for a CPF is active -> employee stays ACTIVE
// If ALL records for a CPF are inactive -> employee is DEACTIVATED
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
  // Format: NOME','CPF','CARGO','DEPTO','EMPRESA','Ativo'
  // First field has NO leading quote, last field has trailing quote
  if (line.includes("','")) {
    // Split by ',' pattern
    const parts = line.split("','");
    // Clean each element
    return parts.map((v, idx) => {
      let cleaned = v.trim();
      // Only the LAST element has a trailing quote to remove: "Ativo'" -> "Ativo"
      if (idx === parts.length - 1) {
        cleaned = cleaned.replace(/'$/, '');
      }
      // Clean any remaining surrounding quotes (safety)
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
    
    // Handle both single and double quotes
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
  
  // Clean remaining quotes from values
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
};

// Parse CSV with fixed column positions (no header)
const parseWithFixedColumns = (lines: string[]): CsvRow[] => {
  // Fixed column order: NOME, CPF, CARGO, DEPARTAMENTO, EMPRESA, SITUACAO
  const rows: CsvRow[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const values = parseCSVLine(line);
    if (values.length < 2) continue; // At least name and CPF required
    
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
  
  // Normalize headers: lowercase, remove accents, remove underscores for matching
  const headers = rawHeaders.map(h => {
    const normalized = h.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/['"]/g, '');
    return normalized;
  });
  
  const rows: CsvRow[] = [];
  
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse line using quote-aware parser
    const values = parseCSVLine(line);
    
    // Build row using header mappings
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
    };
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      // Try exact match first
      let targetField = headerMappings[header];
      
      // Try without underscores
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
  
  // Check if this looks like a header or data
  // Headers usually have keywords like "CPF", "NOME", "CARGO", etc.
  const looksLikeHeader = firstValues.some(v => {
    const lower = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return ['cpf', 'nome', 'cargo', 'empresa', 'situacao', 'ativo', 'funcionario', 
            'centro', 'departamento', 'email', 'telefone'].some(h => lower.includes(h));
  });
  
  if (looksLikeHeader) {
    // Check if first line is malformed and we should use line 2 as header
    let headerLineIndex = 0;
    if (firstLine.startsWith("'") || firstLine.includes("\"'") || firstLine.includes("'\"")) {
      headerLineIndex = 1;
      if (lines.length < 3) return [];
    }
    return parseWithHeader(lines, headerLineIndex);
  } else {
    // Process with fixed column positions (no header)
    return parseWithFixedColumns(lines);
  }
};

// Helper function to release assets from a deactivated employee
const releaseAssetsFromFuncionario = async (funcionarioId: string) => {
  let releasedCount = 0;

  // Release assets (notebooks, celulares)
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

  // Release phone lines
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

  // Release vehicles
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

export function ImportFuncionariosDialog() {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
  const [consolidationInfo, setConsolidationInfo] = useState<ConsolidationInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

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
    } catch (error) {
      toast.error("Erro ao ler arquivo CSV");
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
      assetsReleased: 0,
      errors: [],
    };
    
    // Fetch all empresas and equipes for name matching
    const [empresasRes, equipesRes] = await Promise.all([
      supabase.from('empresas').select('id, nome').eq('active', true),
      supabase.from('equipes').select('id, nome').eq('active', true),
    ]);
    
    const empresasMap = new Map(
      (empresasRes.data || []).map(e => [e.nome.toLowerCase(), e.id])
    );
    const equipesMap = new Map(
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
        // Check if funcionario exists by CPF
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
            // Deactivate existing employee and release their assets
            const { error } = await supabase
              .from('funcionarios')
              .update({ active: false })
              .eq('id', existing.id);
            
            if (error) throw error;
            
            // Release all assets associated with this employee
            const releasedCount = await releaseAssetsFromFuncionario(existing.id);
            result.deactivated++;
            result.assetsReleased += releasedCount;
          } else {
            // Don't create inactive employees - just skip
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
          const empresaId = empresasMap.get(row.empresa.toLowerCase());
          if (empresaId) updateData.empresa_id = empresaId;
        }
        
        // Match equipe by name
        if (row.equipe) {
          const equipeId = equipesMap.get(row.equipe.toLowerCase());
          if (equipeId) updateData.equipe_id = equipeId;
        }
        
        // Active status - already handled above, always true here
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
        
        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('funcionarios')
            .update(updateData)
            .eq('id', existing.id);
          
          if (error) throw error;
          result.updated++;
        } else {
          // Create new - CPF is required
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
      if (result.deactivated > 0) parts.push(`${result.deactivated} inativados`);
      toast.success(`Importação concluída: ${parts.join(', ')}`);
    } else {
      toast.warning(`Importação concluída com ${result.errors.length} erros`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreviewData([]);
    setConsolidationInfo(null);
    setResult(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Funcionários via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV para atualizar os dados dos funcionários.
            O CPF será usado como identificador único.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
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
              Formato: CPF;NOME;EMAIL;TELEFONE;CARGO;DEPARTAMENTO;EMPRESA;ATIVO
            </p>
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
          
          {/* Preview */}
          {previewData.length > 0 && !result && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                <p>Prévia: {previewData.length} funcionários únicos</p>
                {consolidationInfo && consolidationInfo.duplicatesConsolidated > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ({consolidationInfo.originalCount} linhas no CSV → {consolidationInfo.duplicatesConsolidated} CPFs duplicados consolidados)
                  </p>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">CPF</th>
                      <th className="p-2 text-left">Nome</th>
                      <th className="p-2 text-left">Cargo</th>
                      <th className="p-2 text-left">Empresa</th>
                      <th className="p-2 text-left">Ativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{normalizeCpf(row.cpf)}</td>
                        <td className="p-2">{row.nome || '-'}</td>
                        <td className="p-2">{row.cargo || '-'}</td>
                        <td className="p-2">{row.empresa || '-'}</td>
                        <td className="p-2">{row.ativo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    ... e mais {previewData.length - 10} registros
                  </p>
                )}
              </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-500/10 text-green-600 rounded-lg p-3 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.updated}</p>
                  <p className="text-xs">Atualizados</p>
                </div>
                <div className="bg-blue-500/10 text-blue-600 rounded-lg p-3 text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-lg font-bold">{result.created}</p>
                  <p className="text-xs">Criados</p>
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
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {previewData.length > 0 && !result && (
            <Button onClick={processImport} disabled={isProcessing}>
              {isProcessing ? 'Processando...' : `Importar ${previewData.length} registros`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
