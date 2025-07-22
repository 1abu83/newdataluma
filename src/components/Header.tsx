
"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDown, TrendingUp, Wallet, ArrowDownLeft } from 'lucide-react';
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
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

interface HeaderProps {
  isMarketBarOpen: boolean;
  onMarketToggle: () => void;
  onDepositClick: () => void;
}

export default function Header({ isMarketBarOpen, onMarketToggle, onDepositClick }: HeaderProps) {
  const { connected } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
              <Image src="/lu.png" alt="Luma logo" width={24} height={24} data-ai-hint="logo" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">LUMADEX</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">Dashboard</a>
             <button onClick={onMarketToggle} className="flex items-center gap-1 transition-colors hover:text-foreground">
              <span>Markets</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isMarketBarOpen && "rotate-180")} />
            </button>
            <a href="#" className="transition-colors hover:text-foreground">Trade</a>
            <a href="#" className="transition-colors hover:text-foreground">Wallet</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isClient && connected && (
             <Button variant="outline" onClick={onDepositClick} className="h-9 px-3 text-xs md:text-sm">
              <ArrowDownLeft className="mr-2 h-4 w-4" />
              Deposit
            </Button>
          )}
          {isClient && (
            <div className="flex items-center [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs [&>button]:md:text-sm [&>button]:md:w-auto [&_svg]:h-5 [&_svg]:w-5 [&_.wallet-adapter-button-trigger>span]:hidden md:[&_.wallet-adapter-button-trigger>span]:inline">
              <WalletMultiButton />
            </div>
          )}
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
        </div>
      </div>
    </header>
  );
}
