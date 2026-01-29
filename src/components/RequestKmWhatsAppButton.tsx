import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useNotificationJobs } from "@/hooks/useNotificationJobs";
import { toast } from "sonner";

interface RequestKmWhatsAppButtonProps {
  vehicleId: string;
  vehiclePlaca: string;
  employeeName?: string;
  employeePhone?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function RequestKmWhatsAppButton({
  vehicleId,
  vehiclePlaca,
  employeeName,
  employeePhone,
  disabled = false,
  variant = "outline",
  size = "sm",
}: RequestKmWhatsAppButtonProps) {
  const { requestKmViaWhatsApp, isRequesting } = useNotificationJobs();
  const [justSent, setJustSent] = useState(false);

  const handleRequest = async () => {
    if (!employeePhone) {
      toast.error("Funcionário não possui telefone cadastrado");
      return;
    }

    try {
      await requestKmViaWhatsApp({
        vehicleId,
        vehiclePlaca,
        employeeName: employeeName || "Motorista",
        employeePhone,
      });
      setJustSent(true);
      setTimeout(() => setJustSent(false), 5000);
    } catch (error) {
      console.error("Error requesting KM:", error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRequest}
      disabled={disabled || isRequesting || justSent || !employeePhone}
      className="gap-2"
      title={
        !employeePhone
          ? "Funcionário sem telefone cadastrado"
          : "Solicitar KM via WhatsApp"
      }
    >
      <MessageSquare className="h-4 w-4" />
      {isRequesting
        ? "Enviando..."
        : justSent
          ? "Enviado!"
          : "Solicitar KM"}
    </Button>
  );
}
