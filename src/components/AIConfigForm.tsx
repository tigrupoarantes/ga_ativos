import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, Eye, EyeOff, Save, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AIConfigForm() {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_config" as any)
        .select("value")
        .eq("key", "OPENAI_API_KEY")
        .single();

      if (!error && data) {
        const val = (data as any).value;
        if (val) {
          setHasToken(true);
          // Show masked version
          setToken(val);
        }
      }
    } catch (e) {
      console.error("Error loading AI config:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token.trim()) {
      toast.error("Insira um token válido");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("app_config" as any)
        .upsert(
          { key: "OPENAI_API_KEY", value: token.trim(), updated_at: new Date().toISOString() } as any,
          { onConflict: "key" }
        );

      if (error) throw error;

      setHasToken(true);
      toast.success("Token da IA salvo com sucesso!");
    } catch (e: any) {
      console.error("Error saving AI config:", e);
      toast.error("Erro ao salvar token: " + (e.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  const maskedToken = (val: string) => {
    if (!val || val.length < 8) return val;
    return val.slice(0, 7) + "•".repeat(Math.min(val.length - 11, 30)) + val.slice(-4);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>Inteligência Artificial</CardTitle>
          {hasToken && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </div>
        <CardDescription>
          Configure o token da OpenAI para utilizar funcionalidades de IA em todo o sistema (Relatórios IA, Chat de Contratos, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ai-token">Token OpenAI (API Key)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="ai-token"
                type={showToken ? "text" : "password"}
                placeholder="sk-..."
                value={showToken ? token : (hasToken && token ? maskedToken(token) : token)}
                onChange={(e) => {
                  setToken(e.target.value);
                  setHasToken(false);
                }}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtenha sua chave em{" "}
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              platform.openai.com/api-keys
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
