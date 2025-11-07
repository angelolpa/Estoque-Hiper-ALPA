'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowRight, LogIn, LogOut, Package, BarChart } from "lucide-react";
import { Button } from "./ui/button";

const features = [
  {
    title: "Registrar Entrada",
    description: "Use o leitor para registrar a entrada de produtos no estoque.",
    href: "/entrada",
    icon: LogIn,
    cta: "Iniciar Registro",
    variant: "default"
  },
  {
    title: "Registrar Saída",
    description: "Use o leitor para registrar a baixa de produtos do estoque.",
    href: "/saida",
    icon: LogOut,
    cta: "Iniciar Baixa",
    variant: "outline"
  },
  {
    title: "Gerenciar Produtos",
    description: "Adicione, edite ou visualize os produtos cadastrados no sistema.",
    href: "/produtos",
    icon: Package,
    cta: "Ver Produtos",
    variant: "outline"
  },
  {
    title: "Relatório de Estoque",
    description: "Visualize o balanço de entradas e saídas de todos os produtos.",
    href: "/relatorio",
    icon: BarChart,
    cta: "Ver Relatório",
    variant: "outline"
  },
];

export default function DashboardClient() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <Card key={feature.title} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
              <feature.icon className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline text-2xl">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Link href={feature.href} className="w-full">
              <Button className="w-full" variant={feature.variant as any}>
                {feature.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
