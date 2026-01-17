import { useState } from "react";
import { VehicleLayout } from "@/components/VehicleLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, History } from "lucide-react";
import { useVeiculosHistoricoResponsavel } from "@/hooks/useVeiculosHistoricoResponsavel";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataTablePagination } from "@/components/DataTablePagination";

export default function VeiculosHistorico() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { historico, isLoading } = useVeiculosHistoricoResponsavel();

  const filteredHistorico = historico.filter((h) => {
    const search = debouncedSearch.toLowerCase();
    return (
      h.veiculo_placa?.toLowerCase().includes(search) ||
      h.funcionario_anterior?.nome?.toLowerCase().includes(search) ||
      h.funcionario_novo?.nome?.toLowerCase().includes(search) ||
      h.usuario_alteracao?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredHistorico.length / itemsPerPage);
  const paginatedHistorico = filteredHistorico.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <VehicleLayout>
      <PageHeader
        title="Histórico de Responsáveis"
        description="Registro de alterações de responsáveis pelos veículos"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, funcionário..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Responsável Anterior</TableHead>
                      <TableHead>Novo Responsável</TableHead>
                      <TableHead>Data da Alteração</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistorico.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          Nenhum histórico encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedHistorico.map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.veiculo_placa}</TableCell>
                          <TableCell>{h.funcionario_anterior?.nome || "-"}</TableCell>
                          <TableCell>{h.funcionario_novo?.nome || "-"}</TableCell>
                          <TableCell>
                            {h.data_alteracao
                              ? format(new Date(h.data_alteracao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "-"}
                          </TableCell>
                          <TableCell>{h.usuario_alteracao || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {h.observacoes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalCount={filteredHistorico.length}
                pageSize={itemsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </VehicleLayout>
  );
}
