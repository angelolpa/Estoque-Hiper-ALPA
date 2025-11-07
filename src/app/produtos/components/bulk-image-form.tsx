'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { bulkAddImages } from "@/lib/actions/product-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Terminal, Loader2 } from "lucide-react";
import { parse } from 'csv-parse/browser/esm/sync';

const bulkImageSchema = z.object({
  csvFile: z
    .any()
    .refine((files) => files?.length === 1, "É necessário um arquivo CSV.")
    .refine((files) => files?.[0]?.type === "text/csv" || files?.[0]?.name.endsWith('.csv'), "O arquivo deve ser um CSV."),
});

type BulkImageFormValues = z.infer<typeof bulkImageSchema>;

interface BulkImageFormProps {
  onFormSubmitSuccess: () => void;
}

const CHUNK_SIZE = 500;

export function BulkImageForm({ onFormSubmitSuccess }: BulkImageFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ updated: 0, skipped: 0, total: 0 });
  const { toast } = useToast();

  const form = useForm<BulkImageFormValues>({
    resolver: zodResolver(bulkImageSchema),
  });
  
  const fileRef = form.register("csvFile");

  async function onSubmit(data: BulkImageFormValues) {
    setIsProcessing(true);
    setProgress(0);
    setResults({ updated: 0, skipped: 0, total: 0 });

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
        
        let cumulativeResults = { updated: 0, skipped: 0 };

        for (let i = 0; i < records.length; i += CHUNK_SIZE) {
          const chunk = records.slice(i, i + CHUNK_SIZE);
          const result = await bulkAddImages(chunk);

          if (!result.success) {
            throw new Error(result.message);
          }

          cumulativeResults.updated += result.updatedCount;
          cumulativeResults.skipped += result.skippedCount;

          setResults({
              total: records.length,
              ...cumulativeResults
          });
          
          setProgress(((i + chunk.length) / records.length) * 100);
        }
        
        toast({ title: "Sucesso", description: `Importação concluída! ${cumulativeResults.updated} imagens atualizadas.` });
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
            O arquivo CSV deve usar ponto e vírgula (;) como delimitador e ter as seguintes colunas como cabeçalho: `id_imagem` e `link_imagem_original`.
            <ul className="list-disc pl-5 mt-2">
                <li>`id_imagem`: ID da imagem cadastrado no produto.</li>
                <li>`link_imagem_original`: A URL completa da imagem do produto.</li>
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
                      Atualizados: {results.updated} | Ignorados: {results.skipped}
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isProcessing} className="w-full">
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : "Importar Imagens"}
                </Button>
            </form>
        </Form>
    </div>
  );
}
