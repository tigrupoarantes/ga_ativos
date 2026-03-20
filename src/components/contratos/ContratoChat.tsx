import { lazy, Suspense, useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Bot, User, Sparkles, Paperclip, FileSpreadsheet } from "lucide-react";
const ReactMarkdown = lazy(() => import("react-markdown"));
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useContratoChat, ContratoChatMessage } from "@/hooks/useContratoChat";
import { extractSaveConsumoIntent } from "@/lib/assistant-tools";

interface ContratoChatProps {
  contratoId: string;
  contratoNumero: string;
  onDataSaved?: () => void;
}

const SUGGESTIONS = [
  "Qual a tendência de consumo deste contrato?",
  "Resuma os últimos 3 meses de consumo",
  "Estou dentro da franquia contratada?",
  "Compare os valores dos últimos meses",
];

export function ContratoChat({ contratoId, contratoNumero, onDataSaved }: ContratoChatProps) {
  const { messages, isLoading, sendMessage, confirmSaveConsumo, clearMessages } = useContratoChat(contratoId);
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; base64: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setPendingFile({ name: file.name, base64 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || pendingFile) && !isLoading) {
      sendMessage(input || "Analise este extrato e extraia os dados de consumo.", pendingFile || undefined);
      setInput("");
      setPendingFile(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const lastAssistantMessage = [...messages].reverse().find((msg) => msg.role === "assistant");
  const pendingSaveIntent = lastAssistantMessage
    ? extractSaveConsumoIntent(lastAssistantMessage.content)
    : null;

  return (
    <Card className="animate-fade-in">
      <div
        ref={dropRef}
        className={cn(
          "flex flex-col h-[400px] relative rounded-lg transition-colors",
          isDragging && "bg-primary/5 ring-2 ring-primary/20"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80 rounded-lg">
            <div className="flex flex-col items-center gap-2 text-primary">
              <FileSpreadsheet className="h-12 w-12" />
              <p className="text-sm font-medium">Solte o arquivo Excel aqui</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold">IA do Contrato {contratoNumero}</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
                Arraste um extrato Excel aqui ou faça perguntas sobre este contrato.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 text-left justify-start whitespace-normal text-xs"
                    onClick={() => sendMessage(s)}
                    disabled={isLoading}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300" />
                      <span className="text-xs text-muted-foreground ml-1">Analisando...</span>
                    </div>
                  </Card>
                </div>
              )}
              {pendingSaveIntent && (
                <Card className="border-primary/20 bg-primary/5 p-3">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm">
                      O assistente preparou {pendingSaveIntent.data.length} registro(s) de consumo para salvar neste contrato.
                    </p>
                    <Button
                      onClick={async () => {
                        setIsSavingSuggestion(true);
                        const saved = await confirmSaveConsumo(pendingSaveIntent);
                        if (saved) onDataSaved?.();
                        setIsSavingSuggestion(false);
                      }}
                      disabled={isLoading || isSavingSuggestion}
                    >
                      {isSavingSuggestion ? "Salvando..." : "Confirmar e salvar consumos"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Pending file indicator */}
        {pendingFile && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 text-xs bg-primary/5 rounded-md px-3 py-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="truncate">{pendingFile.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-auto"
                onClick={() => setPendingFile(null)}
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre o contrato ou arraste um extrato..."
              className="min-h-[40px] max-h-[100px] resize-none text-sm"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={(!input.trim() && !pendingFile) || isLoading} className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
            {messages.length > 0 && (
              <Button type="button" variant="outline" size="icon" onClick={clearMessages} disabled={isLoading} className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </Card>
  );
}

function ChatBubble({ message }: { message: ContratoChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-primary" : "bg-primary/10"
      )}>
        {isUser ? <User className="h-3.5 w-3.5 text-primary-foreground" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
      </div>
      <Card className={cn("p-3 max-w-[80%]", isUser && "bg-primary text-primary-foreground")}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Suspense fallback={<p className="text-sm whitespace-pre-wrap">{message.content}</p>}>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </Suspense>
        )}
      </Card>
    </div>
  );
}
