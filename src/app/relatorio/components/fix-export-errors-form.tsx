'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTransition } from "react";
import { fixExportErrors } from "@/lib/actions/report-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const fixErrorsSchema = z.object({
  errorHtml: z.string().min(10, { message: "O texto do erro é muito curto." }),
});

type FixErrorsFormValues = z.infer<typeof fixErrorsSchema>;

interface FixExportErrorsFormProps {
  onFormSubmitSuccess: () => void;
}

export function FixExportErrorsForm({ onFormSubmitSuccess }: FixExportErrorsFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<FixErrorsFormValues>({
    resolver: zodResolver(fixErrorsSchema),
  });

  function onSubmit(data: FixErrorsFormValues) {
    startTransition(async () => {
      const result = await fixExportErrors(data.errorHtml);
      
      if (result.success) {
        toast({ title: "Sucesso", description: result.message });
        onFormSubmitSuccess();
        form.reset();
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como usar</AlertTitle>
        <AlertDescription>
          Cole o HTML completo da mensagem de erro de exportação no campo abaixo. O sistema irá encontrar automaticamente os códigos de barras mencionados no erro e removê-los do banco de dados para corrigir a exportação.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="errorHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HTML da Mensagem de Erro</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Cole o código HTML da notificação de erro aqui. Ex: <div class="notification danger">...'
                    className="min-h-[150px] font-mono text-xs"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Processando..." : "Analisar e Corrigir Erros"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
