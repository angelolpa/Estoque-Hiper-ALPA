'use client';

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StockSummaryForDisplay } from "@/lib/definitions";
import { Download, Trash2, Loader2, Search, ChevronLeft, ChevronRight, Wrench, Package } from "lucide-react";
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
import { clearScans, getStockSummaryForExport } from "@/lib/actions/report-actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FixExportErrorsForm } from "./fix-export-errors-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface ReportClientProps {
  summary: StockSummaryForDisplay[];
  totalPages: number;
  currentPage: number;
  currentLimit: number;
  currentQuery: string;
}

export default function ReportClient({ 
  summary: initialSummary,
  totalPages,
  currentPage,
  currentLimit,
  currentQuery
}: ReportClientProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const [isClient, setIsClient] = useState(false);
  const [fixErrorsOpen, setFixErrorsOpen] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

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

  const handleLimitChange = (newLimit: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('limit', newLimit);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleExport = async () => {
    startTransition(async () => {
      // Fetch all data for export, ignoring client-side pagination and filters
      const { summary: allData } = await getStockSummaryForExport();
      
      const csvRows: string[] = [];

      allData.forEach(row => {
          csvRows.push([row.barcode, row.stock_level].join(';'));
      });
  
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_estoque_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };
  
  const handleClearScans = () => {
    startTransition(async () => {
      const result = await clearScans();
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.message,
        });
        setSummary(summary.map(s => ({ ...s, stock_level: 0 })));
        router.refresh();
      } else {
        toast({
          title: "Erro!",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };
  
  const onFixSuccess = () => {
    setFixErrorsOpen(false);
    router.refresh();
  }


  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              const timer = setTimeout(() => handleSearch(e.target.value), 500);
              return () => clearTimeout(timer);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Dialog open={fixErrorsOpen} onOpenChange={setFixErrorsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                    <Wrench className="mr-2 h-4 w-4" />
                    <span className="sm:hidden">Corrigir Erros</span>
                    <span className="hidden sm:inline">Corrigir Erros de Exportação</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Corrigir Erros de Exportação</DialogTitle>
                </DialogHeader>
                <FixExportErrorsForm onFormSubmitSuccess={onFixSuccess} />
              </DialogContent>
            </Dialog>
            <Button onClick={handleExport} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Download className="mr-2 h-4 w-4" />)}
              <span className="sm:hidden">Exportar</span>
              <span className="hidden sm:inline">Exportar para CSV</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  <span className="sm:hidden">Zerar</span>
                  <span className="hidden sm:inline">Zerar Movimentação</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá apagar permanentemente
                    todas as entradas e saídas do sistema. O estoque de todos os produtos
                    será zerado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearScans}>
                    Sim, zerar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>


      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead>Nome do Produto</TableHead>
                    <TableHead>Códigos de Barras</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {summary.length > 0 ? (
                    summary.map((item, index) => (
                    <TableRow key={`${item.system_id}-${index}`}>
                        <TableCell className="text-muted-foreground">{item.system_id}</TableCell>
                        <TableCell>
                        <Avatar>
                            <AvatarImage src={item.image_url ?? undefined} alt={item.name} />
                            <AvatarFallback>
                                <Package className="h-5 w-5 text-muted-foreground" />
                            </AvatarFallback>
                        </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">
                        {item.name}
                        </TableCell>
                        <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {item.barcodes.map((barcode) => (
                            <Badge key={barcode} variant="outline" className="text-xs font-mono">
                                {barcode}
                            </Badge>
                            ))}
                        </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                        <span className={item.stock_level > 0 ? 'text-green-600' : item.stock_level < 0 ? 'text-red-600' : 'text-foreground'}>
                            {item.stock_level}
                        </span>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Nenhum dado para exibir.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
