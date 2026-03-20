import { useState, useCallback } from "react";
import { toast } from "sonner";
import { streamAssistantResponse } from "@/lib/assistant-stream";
import { SaveConsumoIntent } from "@/lib/assistant-tools";
import { getSupabaseAccessToken } from "@/lib/supabase-auth";

export interface ContratoChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant-hub`;

export function useContratoChat(contratoId: string) {
  const [messages, setMessages] = useState<ContratoChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (input: string, file?: { name: string; base64: string }) => {
    if ((!input.trim() && !file) || isLoading) return;

    const displayContent = file ? `📎 ${file.name}\n${input}` : input;
    const userMsg: ContratoChatMessage = { role: "user", content: displayContent };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const accessToken = await getSupabaseAccessToken();
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsLoading(false);
        return;
      }

      const body: {
        route: "contratos";
        contrato_id: string;
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        file?: { name: string; base64: string };
      } = {
        route: "contratos",
        contrato_id: contratoId,
        messages: [...messages, { role: "user", content: input }],
      };

      if (file) {
        body.file = file;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error("Limite de requisições excedido. Aguarde alguns segundos.");
        } else if (resp.status === 402) {
          toast.error("Créditos insuficientes para IA.");
        } else {
          toast.error(errorData.error || "Erro ao processar.");
        }
        setIsLoading(false);
        return;
      }

      await streamAssistantResponse(resp, updateAssistant);
    } catch (error) {
      console.error("Contrato chat error:", error);
      toast.error("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, contratoId]);

  const confirmSaveConsumo = useCallback(async (intent: SaveConsumoIntent) => {
    if (isLoading) return false;

    const confirmMsg: ContratoChatMessage = {
      role: "user",
      content: "Confirmo o salvamento dos consumos sugeridos.",
    };

    setMessages((prev) => [...prev, confirmMsg]);
    setIsLoading(true);

    try {
      const accessToken = await getSupabaseAccessToken();
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        setIsLoading(false);
        return false;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          route: "contratos",
          contrato_id: contratoId,
          tool_action: "save_consumo",
          tool_payload: intent,
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(data.error || "Erro ao salvar consumo.");
        return false;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "Consumos salvos com sucesso.",
        },
      ]);
      toast.success(data.message || "Consumos salvos com sucesso.");
      return true;
    } catch (error) {
      console.error("Confirm save consumo error:", error);
      toast.error("Erro ao salvar consumo.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contratoId, isLoading]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, confirmSaveConsumo, clearMessages };
}
