import { AppLayout } from "@/components/AppLayout";
import { ReportsChat } from "@/components/ReportsChat";
import { PageHeader } from "@/components/PageHeader";

export default function Relatorios() {
  return (
    <AppLayout>
      <PageHeader
        title="Relatórios IA"
        description="Faça perguntas sobre os dados do sistema usando linguagem natural"
      />
      <ReportsChat />
    </AppLayout>
  );
}
