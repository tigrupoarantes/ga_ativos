import { OficinaLayout } from "@/components/OficinaLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, AlertCircle } from "lucide-react";

export default function Pecas() {
  return (
    <OficinaLayout>
      <div className="space-y-6">
        <PageHeader
          title="Peças e Estoque"
          description="Gerencie o estoque de peças"
          icon={Package}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div />
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Peça
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma peça cadastrada</h3>
              <p className="text-muted-foreground max-w-sm">
                Cadastre peças para controlar o estoque da oficina.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </OficinaLayout>
  );
}
