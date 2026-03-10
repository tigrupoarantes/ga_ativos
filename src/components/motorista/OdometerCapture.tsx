import { useRef, useState } from "react";
import { Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { OcrResult } from "@/hooks/useMotoristaOdometer";

interface Props {
  reportType: "checkin" | "checkout";
  vehiclePlaca: string;
  onCapture: (
    imageBase64: string,
    imageFile: File,
    extractedKm: number | null,
    confidence: string
  ) => void;
  onBack: () => void;
  callOcr: (imageBase64: string) => Promise<OcrResult>;
}

export function OdometerCapture({
  reportType,
  vehiclePlaca,
  onCapture,
  onBack,
  callOcr,
}: Props) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    try {
      // Comprime para preview (qualidade original para exibição)
      const base64Preview = await readFileAsBase64(file);
      // Comprime para OCR (max 2048px, JPEG 90%) — resolução maior preserva dígitos pequenos no display
      const base64Ocr = await compressImage(file, 2048, 0.90);

      let ocrResult: OcrResult = {
        extractedKm: null,
        confidence: "low",
        rawResponse: "",
      };

      try {
        ocrResult = await callOcr(base64Ocr);
      } catch (err) {
        console.error("OCR error:", err);
        toast.warning(
          "Não foi possível ler o hodômetro automaticamente. Insira o KM manualmente."
        );
      }

      onCapture(base64Preview, file, ocrResult.extractedKm, ocrResult.confidence);
    } catch (err) {
      toast.error("Erro ao processar a foto. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  /** Redimensiona e comprime a imagem usando Canvas antes de enviar ao OCR */
  const compressImage = (file: File, maxPx: number, quality: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = url;
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reseta o input para permitir nova seleção da mesma foto
    e.target.value = "";
  };

  const label = reportType === "checkin" ? "Check-in" : "Check-out";

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          disabled={isProcessing}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="font-semibold">{label} — Foto do Hodômetro</p>
          <p className="text-sm text-muted-foreground">{vehiclePlaca}</p>
        </div>
      </div>

      {isProcessing ? (
        /* Estado de processamento */
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -inset-1 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold">Analisando foto com IA...</p>
            <p className="text-sm text-muted-foreground mt-1">
              O hodômetro está sendo lido automaticamente
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Instruções */}
          <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 p-6 text-center bg-muted/20">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">Fotografe o hodômetro</p>
            <p className="text-sm text-muted-foreground">
              Enquadre bem os números do hodômetro para a IA conseguir ler
              automaticamente.
            </p>
          </div>

          {/* Input de câmera oculto */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Botão de captura */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full h-16 text-base rounded-2xl gap-3 shadow-lg"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-6 w-6" />
              Abrir Câmera
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
