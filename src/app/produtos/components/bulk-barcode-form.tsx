'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { bulkAddBarcodes } from "@/lib/actions/product-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Terminal, Loader2 } from "lucide-react";
import { parse } from 'csv-parse/browser/esm/sync';

const bulkBarcodeSchema = z.object({
  csvFile: z
    .any()
    .refine((files) => files?.length === 1, "É necessário um arquivo CSV.")
    .refine((files) => files?.[0]?.type === "text/csv" || files?.[0]?.name.endsWith('.csv'), "O arquivo deve ser um CSV."),
});

type BulkBarcodeFormValues = z.infer<typeof bulkBarcodeSchema>;

interface BulkBarcodeFormProps {
  onFormSubmitSuccess: () => void;
}

const CHUNK_SIZE = 500;

export function BulkBarcodeForm({ onFormSubmitSuccess }: BulkBarcodeFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ inserted: 0, skipped: 0, total: 0 });
  const { toast } = useToast();

  const form = useForm<BulkBarcodeFormValues>({
    resolver: zodResolver(bulkBarcodeSchema),
  });
  
  const fileRef = form.register("csvFile");

  async function onSubmit(data: BulkBarcodeFormValues) {
    setIsProcessing(true);
    setProgress(0);
    setResults({ inserted: 0, skipped: 0, total: 0 });

    const file = data.csvFile[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        const records: any[] = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          delimiter: ';',
          relax_column_count: true,
        });
        
        setResults(prev => ({ ...prev, total: records.length }));
        
        let cumulativeResults = { inserted: 0, skipped: 0 };

        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
          const chunk = records.slice(i, i + CHUNK_SIZE);
          const result = await bulkAddBarcodes(chunk);

          if (!result.success) {
            throw new Error(result.message);
          }

          cumulativeResults.inserted += result.insertedCount;
          cumulativeResults.skipped += result.skippedCount;

          setResults({
              total: records.length,
              ...cumulativeResults
          });
          
          setProgress(((i + chunk.length) / records.length) * 100);
        }
        
        toast({ title: "Sucesso", description: `Importação concluída! ${cumulativeResults.inserted} códigos de barras adicionados.` });
        onFormSubmitSuccess();
        form.reset();

      } catch (error: any) {
        toast({
          title: "Erro na Importação",
          description: error.message || "Não foi possível processar o arquivo.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
        toast({
            title: "Erro",
            description: "Falha ao ler o arquivo.",
            variant: "destructive",
        });
        setIsProcessing(false);
    };

    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Formato do CSV</AlertTitle>
          <AlertDescription>
            O arquivo CSV deve usar ponto e vírgula (;) como delimitador e ter as seguintes colunas como cabeçalho: `id_produto` e `codigo_barras`.
            <ul className="list-disc pl-5 mt-2">
                <li>`id_produto`: Código do produto do SQL Server.</li>
                <li>`codigo_barras`: O código de barras a ser adicionado.</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                control={form.control}
                name="csvFile"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Arquivo CSV</FormLabel>
                        <FormControl>
                            <Input type="file" accept=".csv" {...fileRef} disabled={isProcessing} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
                />
                
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">
                      Processando {Math.round(results.total * (progress / 100))} de {results.total} registros...
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      Adicionados: {results.inserted} | Ignorados: {results.skipped}
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isProcessing} className="w-full">
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : "Importar Códigos de Barras"}
                </Button>
            </form>
        </Form>
    </div>
  );
}
