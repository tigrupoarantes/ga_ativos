import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { AssistantDomainChat } from "@/components/AssistantDomainChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REPORTS_SUGGESTIONS = [
  "Quantos veículos estão em manutenção?",
  "Qual o valor total da frota FIPE?",
  "Quais funcionários têm CNH vencida?",
  "Liste os contratos que vencem este mês",
  "Quantas ordens de serviço estão abertas?",
  "Quais peças estão com estoque baixo?",
];

const FROTA_SUGGESTIONS = [
  "Quais veículos estão com status de manutenção?",
  "Mostre as últimas leituras suspeitas de quilometragem",
  "Quais multas estão pendentes na frota?",
  "Quem são os responsáveis pelos veículos ativos?",
  "Resuma o status atual da frota",
  "Quais veículos estão sem responsável atribuído?",
];

const OFICINA_SUGGESTIONS = [
  "Quais ordens de serviço estão abertas?",
  "Mostre as preventivas vencidas",
  "Quais peças estão com estoque baixo?",
  "Resuma os gargalos atuais da oficina",
  "Quais veículos têm manutenção preventiva próxima?",
  "Como está a fila de ordens em andamento?",
];

export default function Relatorios() {
  return (
    <AppLayout>
      <PageHeader
        title="Assistentes IA"
        description="Converse com o assistente geral ou com especialistas de frota e oficina."
      />

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reports">Geral</TabsTrigger>
          <TabsTrigger value="frota">Frota</TabsTrigger>
          <TabsTrigger value="oficina">Oficina</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <AssistantDomainChat
            route="reports"
            title="Assistente Geral"
            description="Faça perguntas amplas sobre os dados do sistema, cruzando informações de patrimônio, contratos, frota, oficina e telefonia."
            placeholder="Digite sua pergunta geral sobre o sistema..."
            loadingLabel="Analisando dados gerais..."
            suggestions={REPORTS_SUGGESTIONS}
          />
        </TabsContent>

        <TabsContent value="frota">
          <AssistantDomainChat
            route="frota"
            title="Assistente de Frota"
            description="Analise status da frota, responsáveis, quilometragem, multas e sinais de exceção nos veículos."
            placeholder="Pergunte sobre veículos, KM, responsáveis ou multas..."
            loadingLabel="Analisando dados da frota..."
            suggestions={FROTA_SUGGESTIONS}
          />
        </TabsContent>

        <TabsContent value="oficina">
          <AssistantDomainChat
            route="oficina"
            title="Assistente de Oficina"
            description="Acompanhe ordens de serviço, preventivas, estoque de peças e planos de lavagem com foco operacional."
            placeholder="Pergunte sobre ordens, preventivas, peças ou lavagens..."
            loadingLabel="Analisando dados da oficina..."
            suggestions={OFICINA_SUGGESTIONS}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
