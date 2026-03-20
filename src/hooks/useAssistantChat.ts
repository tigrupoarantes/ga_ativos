import { useState, useCallback } from "react";
import { toast } from "sonner";
import { streamAssistantResponse } from "@/lib/assistant-stream";
import { getSupabaseAccessToken } from "@/lib/supabase-auth";

export type AssistantRoute = "reports" | "frota" | "oficina";

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-hub`;

export function useAssistantChat(route: AssistantRoute) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMsg: AssistantChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((message, index) =>
            index === prev.length - 1 ? { ...message, content: assistantContent } : message,
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const accessToken = await getSupabaseAccessToken();
      if (!accessToken) {
        toast.error("Sessao expirada. Faca login novamente.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          route,
          messages: [...messages, userMsg],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("Limite de requisicoes excedido. Aguarde alguns segundos.");
        } else if (response.status === 402) {
          toast.error("Creditos insuficientes para IA.");
        } else {
          toast.error(errorData.error || "Erro ao processar pergunta.");
        }
        setIsLoading(false);
        return;
      }

      await streamAssistantResponse(response, updateAssistant);
    } catch (error) {
      console.error("Assistant chat error:", error);
      toast.error("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, route]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
