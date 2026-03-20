import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Send, Trash2, Bot, User, Sparkles } from "lucide-react";
const ReactMarkdown = lazy(() => import("react-markdown"));
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useAssistantChat,
  AssistantChatMessage,
  AssistantRoute,
} from "@/hooks/useAssistantChat";

interface AssistantDomainChatProps {
  route: AssistantRoute;
  title: string;
  description: string;
  placeholder: string;
  loadingLabel: string;
  suggestions: string[];
}

export function AssistantDomainChat({
  route,
  title,
  description,
  placeholder,
  loadingLabel,
  suggestions,
}: AssistantDomainChatProps) {
  const { messages, isLoading, sendMessage, clearMessages } = useAssistantChat(route);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-semibold">{title}</h2>
            </div>
            <p className="text-muted-foreground text-center mb-8 max-w-2xl">
              {description}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  className="h-auto py-3 px-4 text-left justify-start whitespace-normal"
                  onClick={() => sendMessage(suggestion)}
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
                    <span className="text-sm text-muted-foreground ml-2">{loadingLabel}</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="border-t pt-4 mt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
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

function MessageBubble({ message }: { message: AssistantChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-primary/10",
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
          isUser && "bg-primary text-primary-foreground",
        )}
      >
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
