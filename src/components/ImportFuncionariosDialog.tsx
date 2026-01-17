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
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ImportResult {
  total: number;
  updated: number;
  created: number;
  skipped: number;
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

const normalizeCpf = (cpf: string) => cpf?.replace(/\D/g, '') || '';

const parseCsv = (text: string): CsvRow[] => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  
  // Parse header (first line)
  const headerLine = lines[0];
  const headers = headerLine.split(/[,;]/).map(h => 
    h.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/['"]/g, '')
  );
  
  const rows: CsvRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma or semicolon
    const values = line.split(/[,;]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Map common header variations
    const mappedRow: CsvRow = {
      cpf: row.cpf || row.cpf_funcionario || '',
      nome: row.nome || row.nome_funcionario || row.funcionario || '',
      email: row.email || row.e_mail || '',
      telefone: row.telefone || row.tel || row.celular || '',
      cargo: row.cargo || row.funcao || row.posicao || '',
      departamento: row.departamento || row.depto || row.setor || '',
      empresa: row.empresa || row.empresa_nome || row.companhia || '',
      equipe: row.equipe || row.time || row.grupo || '',
      ativo: row.ativo || row.status || row.situacao || '',
      is_condutor: row.is_condutor || row.condutor || row.motorista || '',
      cnh_numero: row.cnh_numero || row.cnh || '',
      cnh_categoria: row.cnh_categoria || row.categoria_cnh || '',
      cnh_validade: row.cnh_validade || row.validade_cnh || '',
    };
    
    if (mappedRow.cpf) {
      rows.push(mappedRow);
    }
  }
  
  return rows;
};

export function ImportFuncionariosDialog() {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<CsvRow[]>([]);
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
      
      setPreviewData(rows);
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
          .select('id')
          .eq('cpf', cpf)
          .maybeSingle();
        
        // Prepare update data
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
        
        // Parse active status
        if (row.ativo) {
          const ativoLower = row.ativo.toLowerCase();
          updateData.active = ['sim', 'ativo', 'yes', 'true', '1', 's'].includes(ativoLower);
        }
        
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
              active: updateData.active ?? true,
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
    queryClient.invalidateQueries({ queryKey: ["funcionarios"] });
    
    if (result.errors.length === 0) {
      toast.success(`Importação concluída: ${result.updated} atualizados, ${result.created} criados`);
    } else {
      toast.warning(`Importação concluída com ${result.errors.length} erros`);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreviewData([]);
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
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar um arquivo CSV
              </p>
            </label>
          </div>
          
          {/* Expected Format */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium mb-2">Formato esperado do CSV:</p>
            <code className="text-xs block bg-background p-2 rounded">
              cpf;nome;email;cargo;empresa;ativo<br/>
              12345678901;João Silva;joao@email.com;Gerente;Empresa X;sim
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Colunas suportadas: cpf, nome, email, telefone, cargo, departamento, empresa, equipe, ativo, is_condutor, cnh_numero, cnh_categoria, cnh_validade
            </p>
          </div>
          
          {/* Preview */}
          {previewData.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Prévia: {previewData.length} registros encontrados
              </p>
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
              <div className="grid grid-cols-3 gap-3">
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
