'use client';

import { AppHeader } from '@/components/header';
import { Toaster } from '@/components/ui/toaster';
import { SoundProvider } from '@/hooks/use-sound';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader />
        <main className="flex-grow p-4 sm:px-6 sm:py-8 md:gap-8">
          <div className="w-full max-w-[1000px] mx-auto">
            {children}
          </div>
        </main>
        <Toaster />
      </div>
    </SoundProvider>
  );
}
