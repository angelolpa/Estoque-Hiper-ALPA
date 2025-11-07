import DashboardClient from "@/components/dashboard-client";

export default function Home() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold text-primary">Visão Geral</h1>
      </header>
      <DashboardClient />
    </>
  );
}
