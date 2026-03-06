import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export interface MotoristaVehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  km_atual?: number | null;
}

export interface CheckinReport {
  id: string;
  reported_km: number;
  photo_url?: string | null;
  reported_at: string;
}

export interface CheckoutReport {
  id: string;
  reported_km: number;
  km_diff?: number | null;
  photo_url?: string | null;
  reported_at: string;
}

export interface TodayOdometerState {
  checkin: CheckinReport | null;
  checkout: CheckoutReport | null;
}

export interface OcrResult {
  extractedKm: number | null;
  confidence: "high" | "medium" | "low";
  rawResponse: string;
}

export function useMotoristaOdometer(funcionarioId: string | null) {
  const queryClient = useQueryClient();

  // Query 1: Veículo atribuído a este motorista
  const { data: vehicle = null, isLoading: vehicleLoading } =
    useQuery<MotoristaVehicle | null>({
      queryKey: ["motorista-vehicle", funcionarioId],
      queryFn: async () => {
        if (!funcionarioId) return null;
        const { data, error } = await supabase
          .from("veiculos")
          .select("id, placa, marca, modelo, km_atual")
          .eq("funcionario_id", funcionarioId)
          .eq("active", true)
          .maybeSingle();
        if (error) throw error;
        return data as MotoristaVehicle | null;
      },
      enabled: !!funcionarioId,
    });

  // Query 2: Registros de hoje (check-in e check-out)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayKey = todayStart.toDateString();

  const {
    data: todayState = { checkin: null, checkout: null },
    isLoading: reportsLoading,
  } = useQuery<TodayOdometerState>({
    queryKey: ["motorista-today-reports", vehicle?.id, todayKey],
    queryFn: async () => {
      if (!vehicle?.id) return { checkin: null, checkout: null };

      const { data, error } = await supabase
        .from("vehicle_odometer_reports")
        .select("id, report_type, reported_km, km_diff, photo_url, reported_at")
        .eq("vehicle_id", vehicle.id)
        .eq("source", "app")
        .gte("reported_at", todayStart.toISOString())
        .lte("reported_at", todayEnd.toISOString())
        .order("reported_at", { ascending: true });

      if (error) throw error;

      const checkin =
        (data?.find((r) => r.report_type === "checkin") as CheckinReport) ??
        null;
      const checkout =
        (data?.find((r) => r.report_type === "checkout") as CheckoutReport) ??
        null;

      return { checkin, checkout };
    },
    enabled: !!vehicle?.id,
    refetchInterval: 60_000,
  });

  // Chama a Edge Function de OCR
  const callOcr = async (imageBase64: string): Promise<OcrResult> => {
    const { data, error } = await supabase.functions.invoke("odometer-ocr", {
      body: {
        imageBase64,
        vehicleId: vehicle?.id,
        vehiclePlaca: vehicle?.placa,
      },
    });
    if (error) throw error;
    return data as OcrResult;
  };

  // Faz upload da foto para o bucket odometer-photos
  const uploadOdometerPhoto = async (
    imageFile: File | Blob,
    reportType: "checkin" | "checkout"
  ): Promise<string> => {
    if (!vehicle) throw new Error("Veículo não carregado");
    const date = new Date().toISOString().split("T")[0];
    const uuid = crypto.randomUUID();
    const path = `${vehicle.id}/${date}/${reportType}-${uuid}.jpg`;

    const { error } = await supabase.storage
      .from("odometer-photos")
      .upload(path, imageFile, { contentType: "image/jpeg", upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("odometer-photos")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  // Mutation: Registra check-in ou check-out
  const submitReport = useMutation({
    mutationFn: async (input: {
      type: "checkin" | "checkout";
      km: number;
      photoUrl?: string | null;
    }) => {
      if (!vehicle || !funcionarioId) {
        throw new Error("Veículo ou motorista não encontrado");
      }

      // Calcula km_diff para check-out
      const kmDiff =
        input.type === "checkout" && todayState.checkin != null
          ? input.km - todayState.checkin.reported_km
          : null;

      const { data, error } = await supabase
        .from("vehicle_odometer_reports")
        .insert({
          vehicle_id: vehicle.id,
          employee_id: funcionarioId,
          reported_km: input.km,
          source: "app",
          report_type: input.type,
          photo_url: input.photoUrl ?? null,
          km_diff: kmDiff,
          validation_status: "ok",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["motorista-today-reports", vehicle?.id, todayKey],
      });
      queryClient.invalidateQueries({ queryKey: ["odometer-reports"] });
      queryClient.invalidateQueries({ queryKey: ["veiculos"] });
      const label = variables.type === "checkin" ? "Check-in" : "Check-out";
      toast.success(`${label} registrado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar: " + error.message);
    },
  });

  return {
    vehicle,
    todayState,
    isLoading: vehicleLoading || reportsLoading,
    submitReport,
    callOcr,
    uploadOdometerPhoto,
  };
}
