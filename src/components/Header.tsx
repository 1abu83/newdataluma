
"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown, TrendingUp, Wallet, ArrowDownLeft, ArrowUpRight, Menu, Rocket } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import CustomWalletButton from './CustomWalletButton';
import { useWallet } from '@solana/wallet-adapter-react';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';

interface HeaderProps {
  isMarketBarOpen: boolean;
  onMarketToggle: () => void;
  onDepositClick: () => void;
  onWithdrawClick: () => void;
}

export default function Header({ isMarketBarOpen, onMarketToggle, onDepositClick, onWithdrawClick }: HeaderProps) {
  const { connected } = useWallet();
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-2 md:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
              <Image src="/lu.png" alt="Luma logo" width={24} height={24} data-ai-hint="logo" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">LUMADEX</h1>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">Dashboard</Link>
             <button onClick={onMarketToggle} className="flex items-center gap-1 transition-colors hover:text-foreground">
              <span>Markets</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isMarketBarOpen && "rotate-180")} />
            </button>
            <Link href="/trade" className="transition-colors hover:text-foreground">Trade</Link>
            <Link href="/launchpad" className="transition-colors hover:text-foreground">Launchpad</Link>
          </nav>
          <div className="md:hidden">
            {/* Menu dropdown dihapus untuk tampilan mobile */}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {isClient && (
            <>
              <Button variant="outline" onClick={onDepositClick} className="h-9 px-2 md:px-3 text-xs md:text-sm">
                <ArrowDownLeft className="md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">Deposit</span>
              </Button>
              <Button variant="outline" onClick={onWithdrawClick} className="h-9 px-2 md:px-3 text-xs md:text-sm">
                <ArrowUpRight className="md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">Withdraw</span>
              </Button>
            </>
          )}
          {isClient && (
            <div className="flex items-center [&>button]:h-8 [&>button]:md:h-9 [&>button]:px-2 [&>button]:md:px-3 [&>button]:text-xs [&>button]:md:text-sm [&>button]:w-auto [&>button]:md:w-auto [&_svg]:h-4 [&_svg]:md:h-5 [&_svg]:w-4 [&_svg]:md:w-5">
              <CustomWalletButton />
            </div>
          )}
          {/* Hanya tampilkan Avatar pada desktop */}
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/profil.png" alt="User Avatar" data-ai-hint="person user" />
                    <AvatarFallback>TF</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
