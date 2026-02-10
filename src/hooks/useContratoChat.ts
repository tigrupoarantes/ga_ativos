import { useState, useCallback } from "react";
import { toast } from "sonner";
import { EXTERNAL_SUPABASE_CONFIG } from "@/config/supabase.config";

export interface ContratoChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${EXTERNAL_SUPABASE_CONFIG.url}/functions/v1/contrato-chat`;

export function useContratoChat(contratoId: string) {
  const [messages, setMessages] = useState<ContratoChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (input: string, file?: { name: string; base64: string }) => {
    if ((!input.trim() && !file) || isLoading) return;

    const displayContent = file ? `📎 ${file.name}\n${input}` : input;
    const userMsg: ContratoChatMessage = { role: "user", content: displayContent };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const body: any = {
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
          Authorization: `Bearer ${EXTERNAL_SUPABASE_CONFIG.anonKey}`,
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

      if (!resp.body) throw new Error("Resposta sem conteúdo");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error("Contrato chat error:", error);
      toast.error("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, contratoId]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
