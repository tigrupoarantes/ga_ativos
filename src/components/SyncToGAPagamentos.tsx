import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Building2, Users, AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { useSyncToGAPagamentos, SyncType } from "@/hooks/useSyncToGAPagamentos";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function SyncToGAPagamentos() {
  const { sync, isLoading, lastResult, progress } = useSyncToGAPagamentos();
  const [showErrors, setShowErrors] = useState(false);

  const handleSync = async (syncType: SyncType) => {
    await sync(syncType);
  };

  const allErrors = [
    ...(lastResult?.result.empresas.errors || []),
    ...(lastResult?.result.funcionarios.errors || [])
  ];

  const isProcessing = isLoading && progress.phase !== 'idle' && progress.phase !== 'complete';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
          <CardTitle>Sincronização GA Pagamentos</CardTitle>
        </div>
        <CardDescription>
          Sincronize empresas e funcionários com o sistema GA Pagamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Section */}
        {isProcessing && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {progress.phase === 'empresas' ? (
                <Building2 className="h-5 w-5 text-primary animate-pulse" />
              ) : (
                <Users className="h-5 w-5 text-primary animate-pulse" />
              )}
              <span className="font-medium">
                {progress.phase === 'empresas' ? 'Sincronizando Empresas' : 'Sincronizando Funcionários'}
              </span>
            </div>
            
            <Progress value={progress.percentage} className="h-3" />
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{progress.message}</span>
              <span className="font-mono">
                {progress.current} / {progress.total} ({progress.percentage}%)
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            variant="outline"
            onClick={() => handleSync('empresas')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            {isLoading ? 'Sincronizando...' : 'Sincronizar Empresas'}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSync('funcionarios')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            {isLoading ? 'Sincronizando...' : 'Sincronizar Funcionários'}
          </Button>

          <Button
            onClick={() => handleSync('all')}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Sincronizando...' : 'Sincronizar Tudo'}
          </Button>
        </div>

        {/* Results Section */}
        {lastResult && !isProcessing && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">Último resultado:</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">Empresas</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {lastResult.result.empresas.inserted} inseridas
                  </Badge>
                  <Badge variant="outline">
                    {lastResult.result.empresas.updated} atualizadas
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Funcionários</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {lastResult.result.funcionarios.inserted} inseridos
                  </Badge>
                  <Badge variant="outline">
                    {lastResult.result.funcionarios.updated} atualizados
                  </Badge>
                </div>
              </div>
            </div>

            {allErrors.length > 0 && (
              <Collapsible open={showErrors} onOpenChange={setShowErrors}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {allErrors.length} erro(s) - Clique para ver detalhes
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 rounded-lg bg-destructive/10 text-sm space-y-1 max-h-48 overflow-y-auto">
                    {allErrors.map((error, index) => (
                      <p key={index} className="text-destructive">
                        • {error}
                      </p>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          A sincronização usa CNPJ (empresas) e CPF (funcionários) como chaves únicas. Inclui campos de CNH, vendedor e WhatsApp.
        </p>
      </CardContent>
    </Card>
  );
}
