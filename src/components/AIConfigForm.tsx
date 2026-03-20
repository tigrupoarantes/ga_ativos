import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ShieldAlert } from "lucide-react";

export function AIConfigForm() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle>Inteligencia Artificial</CardTitle>
        </div>
        <CardDescription>
          As configuracoes de IA deste ambiente sao mantidas no backend, via secrets do projeto Supabase.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">Chaves de IA nao sao mais exibidas nem salvas pela interface.</p>
              <p>
                Os chats e funcoes de IA usam secrets configurados nas Edge Functions. Isso evita gravar credenciais
                sensiveis em <code>app_config</code> e reduz exposicao indevida para usuarios autenticados.
              </p>
              <p>
                Para alterar a integracao de IA, atualize os secrets do projeto Supabase e publique novamente as Edge
                Functions afetadas.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
