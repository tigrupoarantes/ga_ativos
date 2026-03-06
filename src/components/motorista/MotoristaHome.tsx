import { Car, MapPin, Home, CheckCircle2, Clock, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  MotoristaVehicle,
  TodayOdometerState,
} from "@/hooks/useMotoristaOdometer";

interface Props {
  vehicle: MotoristaVehicle | null;
  todayState: TodayOdometerState;
  isLoading: boolean;
  driverName?: string | null;
  onStartCapture: (type: "checkin" | "checkout") => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MotoristaHome({
  vehicle,
  todayState,
  isLoading,
  driverName,
  onStartCapture,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm">Carregando dados...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="rounded-full bg-muted p-6">
          <Car className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Nenhum veículo atribuído</p>
          <p className="text-muted-foreground text-sm mt-1">
            Entre em contato com o gestor para ter um veículo associado ao seu
            cadastro.
          </p>
        </div>
      </div>
    );
  }

  const { checkin, checkout } = todayState;
  const bothDone = !!checkin && !!checkout;
  const onlyCheckinDone = !!checkin && !checkout;

  return (
    <div className="flex flex-col gap-6">
      {/* Saudação */}
      <div>
        <p className="text-muted-foreground text-sm">Bom dia,</p>
        <p className="text-xl font-bold">
          {driverName?.split(" ")[0] ?? "Motorista"}
        </p>
      </div>

      {/* Card do Veículo */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-widest text-primary">
                  {vehicle.placa}
                </p>
                <p className="text-sm text-muted-foreground">
                  {vehicle.marca} {vehicle.modelo}
                </p>
              </div>
            </div>
            {vehicle.km_atual != null && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-xs">KM atual</span>
                </div>
                <span className="font-mono font-semibold text-sm">
                  {vehicle.km_atual.toLocaleString("pt-BR")} km
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status do Dia */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Registros de hoje
        </p>
        <div className="flex flex-col gap-2">
          {/* Check-in */}
          <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-1.5 ${checkin ? "bg-green-500/10" : "bg-muted"}`}
              >
                <MapPin
                  className={`h-4 w-4 ${checkin ? "text-green-600" : "text-muted-foreground"}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Check-in</p>
                {checkin && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {checkin.reported_km.toLocaleString("pt-BR")} km
                  </p>
                )}
              </div>
            </div>
            {checkin ? (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {formatTime(checkin.reported_at)}
                </span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>

          {/* Check-out */}
          <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-1.5 ${checkout ? "bg-orange-500/10" : "bg-muted"}`}
              >
                <Home
                  className={`h-4 w-4 ${checkout ? "text-orange-600" : "text-muted-foreground"}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium">Check-out</p>
                {checkout && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {checkout.reported_km.toLocaleString("pt-BR")} km
                    {checkout.km_diff != null && (
                      <span className="text-orange-600 font-semibold ml-1">
                        (+{checkout.km_diff.toLocaleString("pt-BR")} km hoje)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            {checkout ? (
              <div className="flex items-center gap-1.5 text-orange-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {formatTime(checkout.reported_at)}
                </span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      {bothDone ? (
        <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-5 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-700">
            Registros do dia completos!
          </p>
          {checkout?.km_diff != null && (
            <p className="text-sm text-muted-foreground mt-1">
              Você percorreu{" "}
              <span className="font-bold text-foreground">
                {checkout.km_diff.toLocaleString("pt-BR")} km
              </span>{" "}
              hoje.
            </p>
          )}
        </div>
      ) : (
        <Button
          size="lg"
          className="w-full h-16 text-base rounded-2xl gap-3 shadow-lg"
          onClick={() => onStartCapture(onlyCheckinDone ? "checkout" : "checkin")}
        >
          {onlyCheckinDone ? (
            <>
              <Home className="h-6 w-6" />
              Registrar Check-out
            </>
          ) : (
            <>
              <MapPin className="h-6 w-6" />
              Registrar Check-in
            </>
          )}
        </Button>
      )}
    </div>
  );
}
