import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import {
  ContratoComodatoCelularPDF,
  type ContratoComodatoCelularProps,
} from "@/components/pdf/ContratoComodatoCelularPDF";
import {
  TermoResponsabilidadeNotebookPDF,
  type TermoResponsabilidadeNotebookProps,
} from "@/components/pdf/TermoResponsabilidadeNotebookPDF";
import React from "react";

export interface DadosContratoComodato {
  // Funcionário
  funcionario: {
    id: string;
    nome: string;
    cpf: string;
    rg?: string | null;
    cidade?: string | null;
    endereco?: string | null;
    cargo?: string | null;
  };
  // Ativo
  ativo: {
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
    tipo?: { name?: string | null } | null;
  };
  // Atribuição
  atribuicao: {
    id: string;
    data_atribuicao: string | null;
    contrato_pdf_url?: string | null;
    contrato_gerado_em?: string | null;
  };
  // Empresa (opcional)
  empresa?: {
    nome: string;
    cnpj?: string | null;
  } | null;
}

function isCelular(tipoName: string | null | undefined): boolean {
  return !!tipoName?.toLowerCase().includes("celular");
}

function isNotebook(tipoName: string | null | undefined): boolean {
  const n = tipoName?.toLowerCase() ?? "";
  return n.includes("notebook") || n.includes("microinform") || n.includes("computador");
}

export function useContratoComodato() {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Gera o PDF, faz upload no Supabase Storage, atualiza a atribuição e
   * dispara o download automático.
   * Retorna a URL pública salva (ou null em caso de erro).
   */
  async function gerarEFazerUpload(dados: DadosContratoComodato): Promise<string | null> {
    setIsGenerating(true);
    try {
      const tipoName = dados.ativo.tipo?.name;
      const dataAtribuicao = dados.atribuicao.data_atribuicao ?? new Date().toISOString();

      // --- 1. Renderizar PDF ---
      let blob: Blob;

      if (isCelular(tipoName)) {
        const props: ContratoComodatoCelularProps = {
          funcionario: dados.funcionario,
          ativo: {
            modelo: dados.ativo.modelo ?? dados.ativo.nome,
            imei: dados.ativo.imei ?? null,
            imei2: dados.ativo.imei2 ?? null,
            chip_linha: dados.ativo.chip_linha ?? null,
          },
          dataAtribuicao,
          empresa: dados.empresa ?? undefined,
        };
        blob = await pdf(React.createElement(ContratoComodatoCelularPDF, props)).toBlob();
      } else if (isNotebook(tipoName)) {
        const props: TermoResponsabilidadeNotebookProps = {
          funcionario: dados.funcionario,
          ativo: {
            marca: dados.ativo.marca ?? null,
            modelo: dados.ativo.modelo ?? dados.ativo.nome,
            numero_serie: dados.ativo.numero_serie ?? null,
            valor_aquisicao: dados.ativo.valor_aquisicao ?? null,
            acessorios: dados.ativo.acessorios ?? null,
          },
          dataAtribuicao,
          empresa: dados.empresa ?? undefined,
        };
        blob = await pdf(React.createElement(TermoResponsabilidadeNotebookPDF, props)).toBlob();
      } else {
        toast.error("Tipo de ativo não suporta contrato de comodato (use Celular ou Notebook).");
        return null;
      }

      // --- 2. Upload para Supabase Storage ---
      const fileName = `${dados.atribuicao.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("comodato-contratos")
        .upload(fileName, blob, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // --- 3. Obter URL com token de acesso temporário (signed URL por 10 anos) ---
      const { data: signedData, error: signedError } = await supabase.storage
        .from("comodato-contratos")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

      if (signedError) throw signedError;
      const pdfUrl = signedData.signedUrl;

      // --- 4. Atualizar atribuição com URL e timestamp ---
      const { error: updateError } = await supabase
        .from("atribuicoes")
        .update({
          contrato_pdf_url: pdfUrl,
          contrato_gerado_em: new Date().toISOString(),
        })
        .eq("id", dados.atribuicao.id);

      if (updateError) throw updateError;

      // --- 5. Download automático no browser ---
      triggerDownload(blob, `contrato-comodato-${dados.funcionario.nome.replace(/\s+/g, "-")}.pdf`);

      toast.success("Contrato gerado e salvo com sucesso!");
      return pdfUrl;
    } catch (err: any) {
      console.error("Erro ao gerar contrato:", err);
      toast.error(`Erro ao gerar contrato: ${err?.message ?? "Erro desconhecido"}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }

  /**
   * Apenas faz o download a partir de uma URL já existente.
   */
  async function baixarContratoExistente(url: string, nomeArquivo?: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      triggerDownload(blob, nomeArquivo ?? "contrato-comodato.pdf");
    } catch {
      // Fallback: abrir em nova aba
      window.open(url, "_blank");
    }
  }

  return { gerarEFazerUpload, baixarContratoExistente, isGenerating };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
