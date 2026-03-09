import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/external-client";
import { useMotoristaOdometer } from "@/hooks/useMotoristaOdometer";
import { MotoristaHome } from "@/components/motorista/MotoristaHome";
import { OdometerCapture } from "@/components/motorista/OdometerCapture";
import {
  OdometerConfirm,
  type CaptureSession,
} from "@/components/motorista/OdometerConfirm";

type PageView = "home" | "capture" | "confirm";

export default function Motorista() {
  const { user, isMotorista, loading, signOut, funcionarioId } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<PageView>("home");
  const [captureSession, setCaptureSession] = useState<CaptureSession | null>(
    null
  );
  const [driverName, setDriverName] = useState<string | null>(null);
  const [pendingReportType, setPendingReportType] = useState<
    "checkin" | "checkout"
  >("checkin");

  // Redireciona usuários não-motoristas
  useEffect(() => {
    if (!loading && !isMotorista) {
      navigate("/", { replace: true });
    }
  }, [isMotorista, loading, navigate]);

  // Busca nome do motorista para a saudação
  useEffect(() => {
    if (!funcionarioId) return;
    supabase
      .from("funcionarios")
      .select("nome")
      .eq("id", funcionarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nome) setDriverName(data.nome);
      });
  }, [funcionarioId]);

  const { vehicle, todayState, isLoading, submitReport, callOcr, uploadOdometerPhoto } =
    useMotoristaOdometer(funcionarioId);

  const handleStartCapture = (type: "checkin" | "checkout") => {
    setPendingReportType(type);
    setView("capture");
  };

  const handleCaptured = (
    imageBase64: string,
    imageFile: File,
    extractedKm: number | null,
    confidence: string
  ) => {
    setCaptureSession({
      imageBase64,
      imageFile,
      extractedKm,
      confidence,
      reportType: pendingReportType,
    });
    setView("confirm");
  };

  const handleConfirm = async (confirmedKm: number) => {
    if (!captureSession) return;

    let photoUrl: string | null = null;
    try {
      photoUrl = await uploadOdometerPhoto(
        captureSession.imageFile,
        captureSession.reportType
      );
    } catch (err) {
      console.warn("Falha no upload da foto, registrando sem foto:", err);
    }

    await submitReport.mutateAsync({
      type: captureSession.reportType,
      km: confirmedKm,
      photoUrl,
    });

    setCaptureSession(null);
    setView("home");
  };

  const handleBackToHome = () => {
    setCaptureSession(null);
    setView("home");
  };

  const handleBackToCapture = () => {
    setCaptureSession(null);
    setView("capture");
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isMotorista) return null;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col overscroll-none">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-[100dvh]">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <Car className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Registro de KM</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs">Sair</span>
          </Button>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 px-4 py-6 overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {view === "home" && (
            <MotoristaHome
              vehicle={vehicle}
              todayState={todayState}
              isLoading={isLoading}
              driverName={driverName}
              onStartCapture={handleStartCapture}
            />
          )}

          {view === "capture" && vehicle && (
            <OdometerCapture
              reportType={pendingReportType}
              vehiclePlaca={vehicle.placa}
              onCapture={handleCaptured}
              onBack={handleBackToHome}
              callOcr={callOcr}
            />
          )}

          {view === "confirm" && captureSession && vehicle && (
            <OdometerConfirm
              captureSession={captureSession}
              vehiclePlaca={vehicle.placa}
              todayCheckinKm={todayState.checkin?.reported_km ?? null}
              onConfirm={handleConfirm}
              onBack={handleBackToCapture}
              isSubmitting={submitReport.isPending}
            />
          )}
        </main>
      </div>
    </div>
  );
}
