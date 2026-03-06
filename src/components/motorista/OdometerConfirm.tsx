import { useState } from "react";
import { ArrowLeft, AlertTriangle, Info, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CaptureSession {
  imageBase64: string;
  imageFile: File;
  extractedKm: number | null;
  confidence: string;
  reportType: "checkin" | "checkout";
}

interface Props {
  captureSession: CaptureSession;
  vehiclePlaca: string;
  todayCheckinKm: number | null;
  onConfirm: (confirmedKm: number) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function OdometerConfirm({
  captureSession,
  vehiclePlaca,
  todayCheckinKm,
  onConfirm,
  onBack,
  isSubmitting,
}: Props) {
  const [kmValue, setKmValue] = useState<string>(
    captureSession.extractedKm != null
      ? String(captureSession.extractedKm)
      : ""
  );

  const parsedKm = kmValue ? parseInt(kmValue.replace(/\D/g, ""), 10) : null;
  const kmDiffPreview =
    captureSession.reportType === "checkout" &&
    todayCheckinKm != null &&
    parsedKm != null
      ? parsedKm - todayCheckinKm
      : null;

  const { confidence, reportType } = captureSession;
  const needsManualInput =
    captureSession.extractedKm == null || confidence === "low";
  const isLowConfidence = confidence === "low" || confidence === "medium";

  const handleConfirm = () => {
    if (!parsedKm || parsedKm <= 0) return;
    onConfirm(parsedKm);
  };

  const label = reportType === "checkin" ? "Check-in" : "Check-out";

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="font-semibold">Confirmar {label}</p>
          <p className="text-sm text-muted-foreground">{vehiclePlaca}</p>
        </div>
      </div>

      {/* Preview da foto */}
      <div className="overflow-hidden rounded-2xl border bg-black">
        <img
          src={captureSession.imageBase64}
          alt="Foto do hodômetro"
          className="w-full max-h-52 object-contain"
        />
      </div>

      {/* Alertas de confiança do OCR */}
      {needsManualInput && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              KM não detectado automaticamente
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Confira a foto e insira o valor do hodômetro manualmente.
            </p>
          </div>
        </div>
      )}
      {!needsManualInput && confidence === "medium" && (
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Verifique se o valor do hodômetro está correto antes de confirmar.
          </p>
        </div>
      )}

      {/* Input de KM */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="km-input" className="text-sm font-medium">
          Quilometragem do hodômetro
        </Label>
        <Input
          id="km-input"
          type="number"
          inputMode="numeric"
          placeholder="Ex: 47832"
          value={kmValue}
          onChange={(e) => setKmValue(e.target.value)}
          className="h-14 text-xl font-mono text-center rounded-xl"
          disabled={isSubmitting}
        />
        {parsedKm != null && parsedKm > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {parsedKm.toLocaleString("pt-BR")} km
          </p>
        )}
      </div>

      {/* Preview de km_diff para checkout */}
      {reportType === "checkout" && todayCheckinKm != null && kmDiffPreview != null && (
        <div className="flex items-center justify-between rounded-xl bg-orange-50 border border-orange-200 px-4 py-3">
          <span className="text-sm text-orange-800">Km percorridos hoje:</span>
          <span
            className={`font-bold font-mono ${kmDiffPreview < 0 ? "text-red-600" : "text-orange-700"}`}
          >
            {kmDiffPreview >= 0 ? "+" : ""}
            {kmDiffPreview.toLocaleString("pt-BR")} km
            {kmDiffPreview < 0 && (
              <span className="text-xs font-normal ml-1">(verificar)</span>
            )}
          </span>
        </div>
      )}

      {/* Botões */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          size="lg"
          className="w-full h-14 text-base rounded-2xl gap-2"
          onClick={handleConfirm}
          disabled={!parsedKm || parsedKm <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Confirmar {label}
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className="w-full rounded-2xl"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Tirar outra foto
        </Button>
      </div>
    </div>
  );
}
