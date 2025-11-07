import { getProducts } from "@/lib/actions/product-actions";
import ProductClient from "./components/product-client";
import { Badge } from "@/components/ui/badge";

export default async function ProdutosPage({ searchParams }: { searchParams: { page?: string, limit?: string, query?: string }}) {
  const currentPage = Number(searchParams?.page) || 1;
  const currentLimit = Number(searchParams?.limit) || 10;
  const query = searchParams?.query || '';
  
  const { products, totalPages, totalProducts, absoluteTotal } = await getProducts({ page: currentPage, limit: currentLimit, query });

  return (
    <>
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-4xl font-headline font-bold text-primary">Gerenciar Produtos</h1>
          <Badge variant="secondary" className="text-base w-fit">
            Total de Produtos: {absoluteTotal}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-2">Adicione, edite ou visualize os produtos cadastrados no sistema.</p>
      </header>
      <ProductClient 
        initialProducts={products}
        totalPages={totalPages}
        currentPage={currentPage}
        currentLimit={currentLimit}
        totalProducts={totalProducts}
        currentQuery={query}
      />
    </>
  );
}
