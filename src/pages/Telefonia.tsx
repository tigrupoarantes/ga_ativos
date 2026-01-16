import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Smartphone, Wifi, Settings2 } from "lucide-react";
import { useAtivos } from "@/hooks/useAtivos";

export default function Telefonia() {
  const { ativos } = useAtivos();
  
  // Filter assets that have phone-related data (chip_linha or imei)
  const phoneAssets = ativos.filter(a => a.chip_linha || a.imei);
  
  const stats = [
    {
      title: "Linhas Ativas",
      value: phoneAssets.filter(a => a.chip_linha && a.status === "em_uso").length,
      icon: Phone,
      color: "text-status-success",
      bgColor: "bg-status-success/10",
    },
    {
      title: "Celulares Cadastrados",
      value: phoneAssets.filter(a => a.imei).length,
      icon: Smartphone,
      color: "text-status-info",
      bgColor: "bg-status-info/10",
    },
    {
      title: "Chips Disponíveis",
      value: phoneAssets.filter(a => a.chip_linha && a.status === "disponivel").length,
      icon: Wifi,
      color: "text-status-warning",
      bgColor: "bg-status-warning/10",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Telefonia"
          description="Gerencie linhas telefônicas e chips"
          icon={Phone}
        />

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ativos com Telefonia</CardTitle>
            <CardDescription>
              Lista de ativos que possuem chip ou linha telefônica
            </CardDescription>
          </CardHeader>
          <CardContent>
            {phoneAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Settings2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhum ativo com telefonia</h3>
                <p className="text-muted-foreground max-w-sm">
                  Cadastre ativos com chip ou IMEI na página de Ativos para visualizá-los aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {phoneAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{asset.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {asset.patrimonio} • {asset.marca} {asset.modelo}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {asset.chip_linha && (
                        <p className="text-sm font-medium">{asset.chip_linha}</p>
                      )}
                      {asset.imei && (
                        <p className="text-xs text-muted-foreground">IMEI: {asset.imei}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
