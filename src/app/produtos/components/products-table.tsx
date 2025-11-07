'use client';

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/definitions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Package, Pencil } from "lucide-react";

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

export function ProductsTable({ products, onEdit }: ProductsTableProps) {
  return (
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
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.system_id}</TableCell>
                    <TableCell>
                      <Avatar>
                         <AvatarImage src={product.image_url ?? undefined} alt={product.name} />
                        <AvatarFallback>
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {product.barcodes.map((barcode) => (
                          <Badge key={barcode} variant="secondary" className="font-mono">
                            {barcode}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                     <TableCell>
                        <Button variant="outline" size="icon" onClick={() => onEdit(product)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Produto</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum produto cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
