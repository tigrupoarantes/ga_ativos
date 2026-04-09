import { lazy, Suspense, Component, ReactNode, ErrorInfo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Analytics } from "@vercel/analytics/react";

// Páginas EAGER — carregadas no bundle inicial (pequenas, usadas antes/fora do auth check)
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// ─── Páginas LAZY — cada dynamic import vira um JS chunk separado ─────────────

// Dashboard
const Index             = lazy(() => import("./pages/Index"));

// Ativos
const Ativos            = lazy(() => import("./pages/Ativos"));
const TiposAtivos       = lazy(() => import("./pages/TiposAtivos"));

// Pessoas
const Funcionarios      = lazy(() => import("./pages/Funcionarios"));
const Empresas          = lazy(() => import("./pages/Empresas"));
const Equipes           = lazy(() => import("./pages/Equipes"));

// Veículos
const Veiculos          = lazy(() => import("./pages/Veiculos"));
const VeiculosMultas    = lazy(() => import("./pages/VeiculosMultas"));
const VeiculosHistorico = lazy(() => import("./pages/VeiculosHistorico"));
const CustosVeiculos    = lazy(() => import("./pages/CustosVeiculos"));

// Oficina
const Oficina           = lazy(() => import("./pages/Oficina"));
const Agenda            = lazy(() => import("./pages/Agenda"));
const OrdensServico     = lazy(() => import("./pages/OrdensServico"));
const Pecas             = lazy(() => import("./pages/Pecas"));
const Preventivas       = lazy(() => import("./pages/Preventivas"));
const Lavagens          = lazy(() => import("./pages/Lavagens"));
const KmColetas         = lazy(() => import("./pages/KmColetas"));
const Notificacoes      = lazy(() => import("./pages/Notificacoes"));

// Outros módulos
const Telefonia          = lazy(() => import("./pages/Telefonia"));
const LinhasTelefonicas  = lazy(() => import("./pages/LinhasTelefonicas"));
const FaturasTelefonia   = lazy(() => import("./pages/FaturasTelefonia"));
const Contratos         = lazy(() => import("./pages/Contratos"));
const ContratoDetalhe   = lazy(() => import("./pages/ContratoDetalhe"));
const Historico         = lazy(() => import("./pages/Historico"));
const Relatorios        = lazy(() => import("./pages/Relatorios"));

// Configurações
const Configuracoes     = lazy(() => import("./pages/Configuracoes"));
const Permissoes        = lazy(() => import("./pages/Permissoes"));
const Usuarios          = lazy(() => import("./pages/Usuarios"));
const AdminBugReports   = lazy(() => import("./pages/AdminBugReports"));

// Motorista — tela mobile-only, maioria dos usuários nunca acessa esta rota
const Motorista         = lazy(() => import("./pages/Motorista"));

// Ajuda
const Ajuda             = lazy(() => import("./pages/Ajuda"));

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
      gcTime: 30 * 60 * 1000, // 30 minutos - tempo no cache após inativo
      refetchOnWindowFocus: false, // Não recarrega ao focar janela
      retry: 1, // Apenas 1 retry em caso de erro
    },
  },
});

// ─── ErrorBoundary — captura falhas de chunk lazy e erros de runtime ─────────
// Sem este componente, qualquer erro não tratado resulta em tela branca.

interface EBState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold">Algo deu errado ao carregar a página.</p>
          <p className="text-sm text-muted-foreground font-mono break-all max-w-lg">
            {this.state.error?.message}
          </p>
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Fallback spinner exibido enquanto o chunk lazy está sendo baixado ────────
// Mantém o esqueleto da sidebar visível para evitar o "flash de tela branca"
const PageLoader = () => (
  <div className="flex h-[100dvh] bg-background">
    <div className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border" />
    <div className="flex flex-1 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <BrowserRouter>
        <AuthProvider>
          <AppErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              {/* Rotas públicas — eager, sem auth check */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Dashboard */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />

              {/* Ativos */}
              <Route path="/ativos" element={<ProtectedRoute><Ativos /></ProtectedRoute>} />
              <Route path="/tipos-ativos" element={<ProtectedRoute><TiposAtivos /></ProtectedRoute>} />

              {/* Pessoas */}
              <Route path="/funcionarios" element={<ProtectedRoute><Funcionarios /></ProtectedRoute>} />
              <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
              <Route path="/equipes" element={<ProtectedRoute><Equipes /></ProtectedRoute>} />

              {/* Veículos */}
              <Route path="/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
              <Route path="/veiculos/multas" element={<ProtectedRoute><VeiculosMultas /></ProtectedRoute>} />
              <Route path="/veiculos/historico" element={<ProtectedRoute><VeiculosHistorico /></ProtectedRoute>} />
              <Route path="/veiculos/custos" element={<ProtectedRoute><CustosVeiculos /></ProtectedRoute>} />

              {/* Oficina */}
              <Route path="/oficina" element={<ProtectedRoute><Oficina /></ProtectedRoute>} />
              <Route path="/oficina/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/oficina/os" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
              <Route path="/oficina/pecas" element={<ProtectedRoute><Pecas /></ProtectedRoute>} />
              <Route path="/oficina/preventivas" element={<ProtectedRoute><Preventivas /></ProtectedRoute>} />
              <Route path="/oficina/lavagem" element={<ProtectedRoute><Lavagens /></ProtectedRoute>} />
              <Route path="/oficina/km" element={<ProtectedRoute><KmColetas /></ProtectedRoute>} />
              <Route path="/oficina/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />

              {/* Outros módulos */}
              <Route path="/telefonia" element={<ProtectedRoute><Telefonia /></ProtectedRoute>} />
              <Route path="/linhas-telefonicas" element={<ProtectedRoute><LinhasTelefonicas /></ProtectedRoute>} />
              <Route path="/telefonia/faturas" element={<ProtectedRoute><FaturasTelefonia /></ProtectedRoute>} />
              <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
              <Route path="/contratos/:id" element={<ProtectedRoute><ContratoDetalhe /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />

              {/* Configurações */}
              <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
              <Route path="/permissoes" element={<ProtectedRoute><Permissoes /></ProtectedRoute>} />
              <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
              <Route path="/admin/bugs" element={<ProtectedRoute><AdminBugReports /></ProtectedRoute>} />

              {/* Motorista — tela mobile-first de registro de KM */}
              <Route path="/ajuda" element={<ProtectedRoute><Ajuda /></ProtectedRoute>} />
              <Route path="/motorista" element={<ProtectedRoute><Motorista /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </AppErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
