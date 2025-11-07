import { getRecentScans } from "@/lib/actions/scan-actions";
import ScanPageClient from "@/components/scan-page-client";
import type { RecentScan } from "@/lib/definitions";

export default async function EntradaPage() {
  const recentScans = (await getRecentScans("entry")) as RecentScan[];

  return (
    <div className="w-full flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Registrar Entrada</h1>
        <p className="text-muted-foreground mt-2 px-4">Leia o código de barras para registrar a entrada de um produto.</p>
      </header>
      <ScanPageClient scanType="entry" initialScans={recentScans} />
    </div>
  );
}
