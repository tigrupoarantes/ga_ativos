import { lazy, Suspense, useState, useRef, useEffect } from "react";
import { Send, Trash2, Bot, User, Sparkles } from "lucide-react";
const ReactMarkdown = lazy(() => import("react-markdown"));
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReportsChat, ChatMessage } from "@/hooks/useReportsChat";

const SUGGESTIONS = [
  "Quantos veículos estão em manutenção?",
  "Qual o valor total da frota FIPE?",
  "Quais funcionários têm CNH vencida?",
  "Liste os contratos que vencem este mês",
  "Quantas ordens de serviço estão abertas?",
  "Quais peças estão com estoque baixo?",
];

export function ReportsChat() {
  const { messages, isLoading, sendMessage, clearMessages } = useReportsChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages Area */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-semibold">Relatórios IA</h2>
            </div>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Faça perguntas sobre os dados do sistema e receba respostas instantâneas baseadas em dados reais.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="h-auto py-3 px-4 text-left justify-start whitespace-normal"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="p-4 max-w-[80%]">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300" />
                    <span className="text-sm text-muted-foreground ml-2">Analisando dados...</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t pt-4 mt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre os dados do sistema..."
              className="min-h-[60px] max-h-[150px] pr-12 resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || isLoading}
              className="h-[60px] w-12"
            >
              <Send className="h-5 w-5" />
            </Button>
            {messages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={clearMessages}
                disabled={isLoading}
                className="h-10 w-12"
                title="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <Card
        className={cn(
          "p-4 max-w-[80%]",
          isUser && "bg-primary text-primary-foreground"
        )}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
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
