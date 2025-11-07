'use client';

import { useEffect, useState, useTransition } from "react";
import { PlusCircle, Upload, Barcode, ImageIcon, ChevronLeft, ChevronRight, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProductForm } from "./product-form";
import { ProductsTable } from "./products-table";
import type { Product } from "@/lib/definitions";
import { BulkProductForm } from "./bulk-product-form";
import { BulkBarcodeForm } from "./bulk-barcode-form";
import { BulkImageForm } from "./bulk-image-form";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clearAllProductData } from "@/lib/actions/product-actions";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface ProductClientProps {
  initialProducts: Product[];
  totalPages: number;
  currentPage: number;
  currentLimit: number;
  totalProducts: number;
  currentQuery: string;
}

export default function ProductClient({ initialProducts, totalPages, currentPage, currentLimit, totalProducts, currentQuery }: ProductClientProps) {
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState(currentQuery);


  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const refreshData = () => {
    if (isClient) {
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const onProductSubmitSuccess = (product: Product) => {
    setIsFormOpen(false);
    refreshData();
  };
  
  const onBulkAdded = () => {
    refreshData();
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', newLimit);
    params.set('page', '1'); // Reset to first page
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };
  
  const handleClearAllData = async () => {
    setIsClearing(true);
    const result = await clearAllProductData();
    if (result.success) {
      toast({
        title: "Sucesso!",
        description: result.message,
      });
      refreshData();
    } else {
      toast({
        title: "Erro!",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsClearing(false);
  };
  
  const handleAddNew = () => {
    setSelectedProduct(undefined);
    setIsFormOpen(true);
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  }


  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex flex-col sm:flex-row flex-1 items-center gap-4">
            <div className="relative w-full sm:w-auto sm:flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Pesquisar..."
                    value={searchTerm}
                    onChange={(e) => {
                    setSearchTerm(e.target.value);
                    // Debounce search
                    const timer = setTimeout(() => handleSearch(e.target.value), 300);
                    return () => clearTimeout(timer);
                    }}
                    className="pl-10"
                />
            </div>
             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={handleAddNew} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Produto
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                    </DialogHeader>
                    <ProductForm 
                    key={selectedProduct?.id ?? 'new'}
                    product={selectedProduct}
                    onFormSubmitSuccess={onProductSubmitSuccess} 
                    />
                </DialogContent>
            </Dialog>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Upload className="mr-2 h-4 w-4" />
                            <span>Produtos em Massa</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline text-2xl">Adicionar Produtos em Massa</DialogTitle>
                        </DialogHeader>
                        <BulkProductForm onFormSubmitSuccess={onBulkAdded} />
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                             <Barcode className="mr-2 h-4 w-4" />
                             <span>Códigos de Barras</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline text-2xl">Importar Códigos de Barras</DialogTitle>
                        </DialogHeader>
                        <BulkBarcodeForm onFormSubmitSuccess={onBulkAdded} />
                    </DialogContent>
                </Dialog>
                <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            <span>Imagens de Produtos</span>
                        </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle className="font-headline text-2xl">Importar Imagens de Produtos</DialogTitle>
                        </DialogHeader>
                        <BulkImageForm onFormSubmitSuccess={onBulkAdded} />
                    </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isPending || isClearing}>
                  {isClearing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  <span className="sm:hidden">Zerar</span>
                  <span className="hidden sm:inline">Zerar Cadastros</span>
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso irá apagar permanentemente
                      todos os produtos, códigos de barras e registros de movimentação.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAllData} disabled={isClearing}>
                      Sim, zerar tudo
                  </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>
      
      <ProductsTable products={products} onEdit={handleEdit} />

      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 py-4">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Itens por página</p>
                <Select
                value={`${currentLimit}`}
                onValueChange={(value) => handleLimitChange(value)}
                >
                <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={currentLimit} />
                </SelectTrigger>
                <SelectContent side="top">
                    {[10, 25, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center space-x-2">
                <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
                </Button>
                <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                >
                Próxima
                <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
