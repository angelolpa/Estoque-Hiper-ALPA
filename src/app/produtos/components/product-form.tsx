'use client';

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useTransition } from "react";
import { addProduct, updateProduct } from "@/lib/actions/product-actions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Trash2 } from "lucide-react";
import type { Product } from "@/lib/definitions";

const productSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  systemId: z.string().min(1, { message: "O Código é obrigatório." }),
  barcodes: z.array(z.object({ value: z.string().min(3, { message: "Código de barras muito curto." }) }))
    .min(1, { message: "É necessário pelo menos um código de barras." }),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onFormSubmitSuccess: (product: Product) => void;
}

export function ProductForm({ product, onFormSubmitSuccess }: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const isEditMode = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: product?.id,
      name: product?.name || "",
      systemId: product?.system_id || "",
      barcodes: product?.barcodes.length ? product.barcodes.map(b => ({ value: b })) : [{ value: "" }],
    },
  });
  
  useEffect(() => {
    form.reset({
      id: product?.id,
      name: product?.name || "",
      systemId: product?.system_id || "",
      barcodes: product?.barcodes.length ? product.barcodes.map(b => ({ value: b })) : [{ value: "" }],
    })
  }, [product, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "barcodes",
  });

  function onSubmit(data: ProductFormValues) {
    startTransition(async () => {
      const action = isEditMode ? updateProduct : addProduct;
      const result = await action(data);
      
      if (result.success && result.product) {
        toast({ title: "Sucesso", description: `Produto ${isEditMode ? 'atualizado' : 'adicionado'} com sucesso.` });
        onFormSubmitSuccess(result.product);
        if (!isEditMode) {
          form.reset();
        }
      } else {
        toast({
          title: "Erro",
          description: result.message || `Não foi possível ${isEditMode ? 'atualizar' : 'adicionar'} o produto.`,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Parafuso Sextavado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="systemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Códigos de Barras</FormLabel>
          <div className="space-y-3 mt-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`barcodes.${index}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder={`Código de barras ${index + 1}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => append({ value: "" })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Código de Barras
          </Button>
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Salvando..." : isEditMode ? "Salvar Alterações" : "Salvar Produto"}
        </Button>
      </form>
    </Form>
  );
}
