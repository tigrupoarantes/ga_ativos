import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";

export const WhatsAppConfigForm = React.forwardRef<HTMLDivElement, object>(
  function WhatsAppConfigForm(_props, ref) {
    const [accessToken, setAccessToken] = useState("");
    const [phoneNumberId, setPhoneNumberId] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

    const handleTestConnection = async () => {
      if (!accessToken || !phoneNumberId) {
        toast.error("Preencha ambos os campos antes de testar");
        return;
      }

      setIsTesting(true);
      setTestResult(null);

      try {
        // Test the WhatsApp API connection by calling a test endpoint
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          setTestResult("success");
          toast.success("Conexão com WhatsApp Business API estabelecida com sucesso!");
        } else {
          const error = await response.json();
          setTestResult("error");
          toast.error(`Erro na conexão: ${error.error?.message || "Credenciais inválidas"}`);
        }
      } catch (error) {
        setTestResult("error");
        toast.error("Erro ao testar conexão. Verifique as credenciais.");
      } finally {
        setIsTesting(false);
      }
    };

    return (
      <Card ref={ref}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Configuração WhatsApp Business</CardTitle>
          </div>
          <CardDescription>
            Configure as credenciais do Meta Business Suite para envio de mensagens via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Como obter as credenciais:</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Acesse o Meta Business Suite</li>
              <li>Vá em Configurações → WhatsApp → Configuração da API</li>
              <li>Copie o Token de Acesso Permanente</li>
              <li>Copie o ID do Número de Telefone</li>
            </ol>
            <a
              href="https://business.facebook.com/settings/whatsapp-business-accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
            >
              Abrir Meta Business Suite
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-token">Token de Acesso (Access Token)</Label>
              <Input
                id="whatsapp-token"
                type="password"
                placeholder="EAAxxxxxxx..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Token permanente gerado no Meta Business Suite
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone-id">ID do Número de Telefone</Label>
              <Input
                id="whatsapp-phone-id"
                type="text"
                placeholder="123456789012345"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ID numérico do número de telefone configurado na API
              </p>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                testResult === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              {testResult === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Conexão estabelecida com sucesso!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Falha na conexão. Verifique as credenciais.</span>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !accessToken || !phoneNumberId}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar Conexão"
              )}
            </Button>
          </div>

          {/* Note about secrets */}
          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>
              <strong>Nota:</strong> Para salvar estas credenciais de forma segura, 
              elas devem ser configuradas como secrets do projeto. Entre em contato 
              com o suporte para configurar os secrets{" "}
              <code className="bg-muted px-1 rounded">WHATSAPP_ACCESS_TOKEN</code> e{" "}
              <code className="bg-muted px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
);

WhatsAppConfigForm.displayName = "WhatsAppConfigForm";
