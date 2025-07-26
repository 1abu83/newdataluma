
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import { useState } from 'react';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import WalletWithdrawDialog from '@/components/WalletWithdrawDialog';

export default function LandingPage() {
  const [isMarketBarOpen, setMarketBarOpen] = useState(false);
  const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
  const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <WalletSetupDialog 
        isOpen={isWalletSetupOpen} 
        onOpenChange={setWalletSetupOpen}
      />
      <WalletWithdrawDialog
        isOpen={isWalletWithdrawOpen}
        onOpenChange={setWalletWithdrawOpen}
      />
      <Header 
        isMarketBarOpen={isMarketBarOpen} 
        onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
        onDepositClick={() => setWalletSetupOpen(true)}
        onWithdrawClick={() => setWalletWithdrawOpen(true)}
      />
      <main className="flex-1 flex items-center justify-center text-center">
        <div className="container px-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6 animate-fade-in-down">
            The Future of Decentralized Trading
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 animate-fade-in-up">
            Experience unparalleled speed, security, and access to a universe of digital assets on the Solana blockchain. Welcome to LUMADEX.
          </p>
          <div className="animate-fade-in">
            <Link href="/dashboard">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full group">
                Launch Trading Dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
