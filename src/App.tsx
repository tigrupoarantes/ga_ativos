import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Ativos from "./pages/Ativos";
import TiposAtivos from "./pages/TiposAtivos";
import Funcionarios from "./pages/Funcionarios";
import Atribuicoes from "./pages/Atribuicoes";
import Empresas from "./pages/Empresas";
import Equipes from "./pages/Equipes";
import Veiculos from "./pages/Veiculos";
import Contratos from "./pages/Contratos";
import Telefonia from "./pages/Telefonia";
import Configuracoes from "./pages/Configuracoes";
import Permissoes from "./pages/Permissoes";
import Usuarios from "./pages/Usuarios";
import Historico from "./pages/Historico";
import Oficina from "./pages/Oficina";
import OrdensServico from "./pages/OrdensServico";
import Pecas from "./pages/Pecas";
import Preventivas from "./pages/Preventivas";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            {/* Dashboard */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            
            {/* Ativos */}
            <Route path="/ativos" element={<ProtectedRoute><Ativos /></ProtectedRoute>} />
            <Route path="/tipos-ativos" element={<ProtectedRoute><TiposAtivos /></ProtectedRoute>} />
            
            {/* Pessoas */}
            <Route path="/funcionarios" element={<ProtectedRoute><Funcionarios /></ProtectedRoute>} />
            <Route path="/atribuicoes" element={<ProtectedRoute><Atribuicoes /></ProtectedRoute>} />
            <Route path="/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
            <Route path="/equipes" element={<ProtectedRoute><Equipes /></ProtectedRoute>} />
            
            {/* Veículos */}
            <Route path="/veiculos" element={<ProtectedRoute><Veiculos /></ProtectedRoute>} />
            
            {/* Oficina */}
            <Route path="/oficina" element={<ProtectedRoute><Oficina /></ProtectedRoute>} />
            <Route path="/oficina/ordens" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
            <Route path="/oficina/pecas" element={<ProtectedRoute><Pecas /></ProtectedRoute>} />
            <Route path="/oficina/preventivas" element={<ProtectedRoute><Preventivas /></ProtectedRoute>} />
            
            {/* Outros módulos */}
            <Route path="/telefonia" element={<ProtectedRoute><Telefonia /></ProtectedRoute>} />
            <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
            
            {/* Configurações */}
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/permissoes" element={<ProtectedRoute><Permissoes /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
