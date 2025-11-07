'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { logScan, validateBarcode } from '@/lib/actions/scan-actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Barcode, Package, Loader2, Minus, Plus } from 'lucide-react';
import type { RecentScan, ValidatedProduct } from '@/lib/definitions';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useSound } from '@/hooks/use-sound';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from './ui/checkbox';

interface ScanPageClientProps {
  scanType: 'entry' | 'exit';
  initialScans: RecentScan[];
  mode?: 'single' | 'multiple';
}

export default function ScanPageClient({ scanType, initialScans }: ScanPageClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  
  const [recentScans, setRecentScans] = useState<RecentScan[]>(initialScans);
  
  const [validatedProduct, setValidatedProduct] = useState<ValidatedProduct | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isMultipleMode, setIsMultipleMode] = useState(false);

  const errorSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { isSoundEnabled } = useSound();

  useEffect(() => {
    setIsClient(true);
    errorSoundRef.current = new Audio('/erro.mp3');
    successSoundRef.current = new Audio('/certo.mp3');
    
    const savedMode = localStorage.getItem('scanMultipleMode');
    if (savedMode !== null) {
      setIsMultipleMode(JSON.parse(savedMode));
    }
    
    // Focus on initial load
    setTimeout(() => {
        inputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('scanMultipleMode', JSON.stringify(isMultipleMode));
    }
  }, [isMultipleMode, isClient]);

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode) return;
  
    // Clear input immediately for a better user experience
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    startTransition(async () => {
      const result = await validateBarcode(barcode, scanType);
      
      if (result.success && result.product) {
        if (isMultipleMode) {
          setValidatedProduct(result.product);
          setIsDialogOpen(true);
          setTimeout(() => quantityInputRef.current?.focus(), 100);
        } else {
          // For single mode, directly submit with quantity 1
          await handleFinalSubmit({ ...result.product, quantity: 1 });
        }
      } else {
        toast({ title: 'Erro!', description: result.message, variant: 'destructive' });
        if (isSoundEnabled && errorSoundRef.current) {
          errorSoundRef.current.play().catch(e => console.error("Erro ao tocar som de erro:", e));
        }
      }
      
      // THIS IS THE DEFINITIVE FIX:
      // Reliably refocus the input after all operations are complete for both modes.
      // The timeout ensures this runs after the browser has finished processing UI updates.
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    });
  };

  const handleFinalSubmit = async (productData: ValidatedProduct & { quantity: number }) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('barcode', productData.barcode);
    formData.append('scanType', scanType);
    formData.append('quantity', productData.quantity.toString());
    formData.append('soundEnabled', String(isSoundEnabled));

    const result = await logScan(null, formData);

    if (result.success) {
      toast({ title: 'Sucesso!', description: result.message, variant: 'default' });
      if (isSoundEnabled && successSoundRef.current) {
        successSoundRef.current.play().catch(e => console.error("Erro ao tocar som de sucesso:", e));
      }
      if (result.productName && result.scannedAt && result.barcode) {
          setRecentScans(prev => [
            {
              product_name: result.productName!,
              scanned_at: result.scannedAt!,
              barcode: result.barcode!,
              image_url: result.imageUrl!,
              system_id: result.systemId!,
              success: true
            }, 
            ...prev
          ].slice(0, 10));
        }
    } else {
      toast({ title: 'Erro!', description: result.message, variant: 'destructive' });
      if (isSoundEnabled && errorSoundRef.current) {
        errorSoundRef.current.play().catch(e => console.error("Erro ao tocar som de erro:", e));
      }
    }

    setIsSubmitting(false);
    
    if (isMultipleMode) {
      setIsDialogOpen(false);
      setValidatedProduct(null);
    }
  };
  
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const barcode = formData.get('barcode') as string;
    handleBarcodeSubmit(barcode);
  };

  const handleDialogSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatedProduct || !quantityInputRef.current) return;
    
    const quantity = parseInt(quantityInputRef.current.value, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast({ title: "Erro", description: "Por favor, insira uma quantidade válida.", variant: "destructive" });
      return;
    }
    
    await handleFinalSubmit({ ...validatedProduct, quantity });
    
    // Also refocus main input after dialog submission
    setTimeout(() => {
        inputRef.current?.focus();
    }, 100);
  };
  
  const formatTime = (dateString: string) => {
    try {
        return format(new Date(dateString), 'HH:mm:ss');
    } catch (e) {
        return '';
    }
  }

  return (
    <div className="space-y-8 w-full">
      <Card className="shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                name="barcode"
                placeholder="Leia ou digite o código de barras..."
                required
                className="pl-10 text-lg h-14"
                disabled={isPending || isSubmitting}
                type="number"
                inputMode="numeric"
                autoComplete="off"
                onWheel={(e) => (e.target as HTMLElement).blur()}
                onFocus={(e) => e.target.addEventListener("wheel", function(e) { e.preventDefault() }, { passive: false })}
                onBlur={(e) => e.target.removeEventListener("wheel", function(e) { e.preventDefault() })}
              />
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multiple-mode"
                    checked={isMultipleMode}
                    onCheckedChange={(checked) => setIsMultipleMode(Boolean(checked))}
                  />
                  <label
                    htmlFor="multiple-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Lançamento Múltiplo
                  </label>
                </div>
              <Button type="submit" disabled={isPending || isSubmitting} className="w-full sm:w-auto">
                {(isPending || isSubmitting) ? 'Registrando...' : 'Registrar Manualmente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {validatedProduct && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => { 
            setIsDialogOpen(open);
            if (!open) {
              setValidatedProduct(null);
              setTimeout(() => inputRef.current?.focus(), 100);
            } 
          }}>
          <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => { e.preventDefault(); }}>
             <form onSubmit={handleDialogSubmit}>
                <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">{validatedProduct.name}</DialogTitle>
                  <DialogDescription>
                    {scanType === 'entry' ? 'Registrando entrada para:' : 'Registrando saída para:'}
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4 flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                      <AvatarImage src={validatedProduct.imageUrl ?? undefined} alt={validatedProduct.name} />
                      <AvatarFallback>
                          <Package className="h-12 w-12 text-muted-foreground" />
                      </AvatarFallback>
                  </Avatar>
                  <div className="w-full space-y-2">
                    <Label htmlFor="quantity" className="text-center block">
                      Quantidade
                    </Label>
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                        onClick={() => {
                          const input = quantityInputRef.current;
                          if (input) {
                            const currentValue = parseInt(input.value, 10);
                            if (currentValue > 1) {
                              input.value = (currentValue - 1).toString();
                            }
                          }
                        }}
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <Input
                        ref={quantityInputRef}
                        id="quantity"
                        name="quantity"
                        type="number"
                        defaultValue="1"
                        min="1"
                        required
                        className="h-12 text-lg text-center w-24"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-12 w-12"
                        onClick={() => {
                          const input = quantityInputRef.current;
                          if (input) {
                            const currentValue = parseInt(input.value, 10) || 0;
                            input.value = (currentValue + 1).toString();
                          }
                        }}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                    {scanType === 'exit' && (
                        <p className="text-sm text-center text-muted-foreground">
                            Em estoque: {validatedProduct.stockLevel}
                        </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirmando...
                        </>
                    ) : "Confirmar"}
                  </Button>
                </DialogFooter>
             </form>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Atividade Recente ({scanType === 'entry' ? 'Entradas' : 'Saídas'})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Código</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código de Barras</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Horário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentScans.length > 0 ? (
                  recentScans.map((scan, index) => (
                    <TableRow key={`${scan.scanned_at}-${index}`} className="animate-in fade-in-0 slide-in-from-top-4 duration-500">
                       <TableCell className="font-mono text-xs hidden md:table-cell">{scan.system_id}</TableCell>
                      <TableCell>
                          <Avatar>
                              <AvatarImage src={scan.image_url ?? undefined} alt={scan.product_name} />
                              <AvatarFallback>
                                  <Package className="h-5 w-5 text-muted-foreground" />
                              </AvatarFallback>
                          </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{scan.product_name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{scan.barcode}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                        {isClient ? formatTime(scan.scanned_at) : ''}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhuma atividade recente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    