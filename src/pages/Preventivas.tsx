import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, AlertCircle } from "lucide-react";

export default function Preventivas() {
  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Manutenções Preventivas"
          description="Agende e gerencie manutenções preventivas"
          icon={Calendar}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div />
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Preventiva
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma preventiva agendada</h3>
              <p className="text-muted-foreground max-w-sm">
                Configure manutenções preventivas para veículos e ativos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </OficinaLayout>
  );
}
