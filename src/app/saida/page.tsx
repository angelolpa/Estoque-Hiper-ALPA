import { getRecentScans } from "@/lib/actions/scan-actions";
import ScanPageClient from "@/components/scan-page-client";
import type { RecentScan } from "@/lib/definitions";

export default async function SaidaPage() {
  const recentScans = (await getRecentScans("exit")) as RecentScan[];

  return (
    <div className="w-full flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Registrar Saída</h1>
        <p className="text-muted-foreground mt-2 px-4">Leia o código de barras para registrar a baixa de um produto.</p>
      </header>
      <ScanPageClient scanType="exit" initialScans={recentScans} />
    </div>
  );
}
