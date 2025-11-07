'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Package, BarChart, Home, Bell, BellOff, LogIn, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSound } from '@/hooks/use-sound';

const navItems = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/entrada', label: 'Entrada', icon: LogIn },
  { href: '/saida', label: 'Saída', icon: LogOut },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/relatorio', label: 'Relatório', icon: BarChart },
];

export function AppHeader() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isSoundEnabled, toggleSound } = useSound();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };

  const renderNavLinks = (isMobile = false) => (
    navItems.map((item) => {
      const isActive = (item.href === '/' && pathname === '/') || (item.href !== '/' && pathname.startsWith(item.href));
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={isMobile ? handleLinkClick : undefined}
          className={cn(
            "transition-colors hover:text-foreground text-xs",
            isActive ? "text-foreground font-semibold" : "text-muted-foreground",
            isMobile && "flex items-center gap-2 text-lg"
          )}
        >
          {isMobile && <item.icon className="h-5 w-5" />}
          {item.label}
        </Link>
      );
    })
  );

  if (!isMounted) {
    return (
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-between">
        <div className="flex items-center gap-2 font-semibold">
           <Image src="/logo.png" alt="StockFlow Logo" width={140} height={35} priority />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-4 lg:gap-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base mr-4">
          <Image src="/logo.png" alt="StockFlow Logo" width={140} height={35} priority />
          <span className="sr-only">StockFlow</span>
        </Link>
        {renderNavLinks()}
      </nav>
      
      <div className="flex items-center gap-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image src="/logo.png" alt="StockFlow Logo" width={140} height={35} priority />
            <span className="sr-only">StockFlow</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="shrink-0" onClick={toggleSound}>
            {isSoundEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
            <span className="sr-only">Ativar ou desativar sons</span>
        </Button>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu de navegação</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
                <SheetHeader>
                  <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                </SheetHeader>
                <nav className="grid gap-6 text-lg font-medium">
                    <Link href="/" onClick={handleLinkClick} className="flex items-center gap-2 text-lg font-semibold mb-4">
                        <Image src="/logo.png" alt="StockFlow Logo" width={140} height={35} priority />
                        <span className="sr-only">StockFlow</span>
                    </Link>
                    {renderNavLinks(true)}
                </nav>
            </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
