import { useAssistantChat, AssistantChatMessage } from "@/hooks/useAssistantChat";

export type ChatMessage = AssistantChatMessage;

export function useReportsChat() {
  return useAssistantChat("reports");
}
