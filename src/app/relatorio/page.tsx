import { getStockSummaryForDisplay } from "@/lib/actions/report-actions";
import ReportClient from "./components/report-client";
import { Badge } from "@/components/ui/badge";

export default async function RelatorioPage({ 
  searchParams 
}: { 
  searchParams: { 
    page?: string, 
    limit?: string,
    query?: string,
  }
}) {
  const currentPage = Number(searchParams?.page) || 1;
  const currentLimit = Number(searchParams?.limit) || 10;
  const query = searchParams?.query || '';

  const { summary, totalPages, totalProducts, totalStockItems } = await getStockSummaryForDisplay({
    page: currentPage,
    limit: currentLimit,
    query: query,
  });

  return (
    <>
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-4xl font-headline font-bold text-primary">Relatório de Estoque</h1>
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-base">
                    Total de Produtos: {totalProducts}
                </Badge>
                <Badge variant="secondary" className="text-base">
                    Total em Estoque: {totalStockItems}
                </Badge>
            </div>
        </div>
        <p className="text-muted-foreground mt-2">Visualize o balanço de entradas e saídas de produtos.</p>
      </header>
      <ReportClient 
        summary={summary}
        totalPages={totalPages}
        currentPage={currentPage}
        currentLimit={currentLimit}
        currentQuery={query}
      />
    </>
  );
}
