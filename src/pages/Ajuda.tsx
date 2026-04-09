import { useState, useMemo, lazy, Suspense } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Search, ExternalLink } from "lucide-react";
import { helpArticles } from "@/data/help-articles";
import { Link } from "react-router-dom";

const ReactMarkdown = lazy(() => import("react-markdown"));

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export default function Ajuda() {
  const [search, setSearch] = useState("");

  const query = normalizeSearch(search);

  const filtered = useMemo(() => {
    if (!query) return helpArticles;
    return helpArticles.filter((a) => {
      const haystack = normalizeSearch(
        `${a.title} ${a.moduleLabel} ${a.keywords.join(" ")}`
      );
      return haystack.includes(query);
    });
  }, [query]);

  // Group articles by module
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const article of filtered) {
      const key = article.moduleLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(article);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Determine which accordion items to open based on search
  const defaultOpen = useMemo(() => {
    if (query) return grouped.map(([label]) => label);
    return [];
  }, [query, grouped]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Central de Ajuda"
          description="Guias e tutoriais para usar o sistema"
          icon={HelpCircle}
        />

        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na ajuda... (ex: importar, multa, comodato, SMTP)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results count */}
        {query && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "artigo encontrado" : "artigos encontrados"}
            {" "}para "{search}"
          </p>
        )}

        {/* Articles grouped by module */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">Nenhum artigo encontrado</p>
              <p className="text-sm mt-1">
                Tente buscar por outro termo ou limpe a busca para ver todos os artigos.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={defaultOpen}
            key={query}
            className="space-y-3"
          >
            {grouped.map(([moduleLabel, articles]) => (
              <AccordionItem
                key={moduleLabel}
                value={moduleLabel}
                className="border rounded-lg px-1"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{moduleLabel}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {articles.length} {articles.length === 1 ? "artigo" : "artigos"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  <div className="space-y-3">
                    {articles.map((article) => (
                      <Card key={article.id} className="shadow-none border">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-semibold">
                              {article.title}
                            </CardTitle>
                            {article.path && (
                              <Link to={article.path}>
                                <Button variant="ghost" size="sm" className="shrink-0 text-xs gap-1">
                                  Ir para a página
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                          <Suspense fallback={<p>Carregando...</p>}>
                            <ReactMarkdown>{article.content}</ReactMarkdown>
                          </Suspense>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </AppLayout>
  );
}
