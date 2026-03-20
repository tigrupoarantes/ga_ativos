import { AssistantDomainChat } from "@/components/AssistantDomainChat";

const SUGGESTIONS = [
  "Quantos veículos estão em manutenção?",
  "Qual o valor total da frota FIPE?",
  "Quais funcionários têm CNH vencida?",
  "Liste os contratos que vencem este mês",
  "Quantas ordens de serviço estão abertas?",
  "Quais peças estão com estoque baixo?",
];

export function ReportsChat() {
  return (
    <AssistantDomainChat
      route="reports"
      title="Relatórios IA"
      description="Faça perguntas sobre os dados do sistema e receba respostas instantâneas baseadas em dados reais."
      placeholder="Digite sua pergunta sobre os dados do sistema..."
      loadingLabel="Analisando dados..."
      suggestions={SUGGESTIONS}
    />
  );
}
