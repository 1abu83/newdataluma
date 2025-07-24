
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import BottomBar from '@/components/BottomBar';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import WalletWithdrawDialog from '@/components/WalletWithdrawDialog';
import './launchpad.css';

const presaleProjects = [
  {
    name: 'LUMA',
    icon: '/lu.png',
    description: 'LUMA powers the core ecosystem, enabling governance and rewards across the platform.',
    softCap: 1000,
    hardCap: 5000,
    raised: 2345,
    price: 0.0001,
  },
  {
    name: 'BRICS',
    icon: '/brics.png',
    description: 'A decentralized token for emerging market economies, fostering cross-border trade.',
    softCap: 2000,
    hardCap: 10000,
    raised: 4120,
    price: 0.00025,
  },
  {
    name: 'BLC',
    icon: '/blc.png',
    description: 'BlockChain Coin is a foundational layer-1 token designed for scalability and security.',
    softCap: 5000,
    hardCap: 25000,
    raised: 8910,
    price: 0.0005,
  },
];

export default function LaunchpadPage() {
  const [isMarketBarOpen, setMarketBarOpen] = useState(false);
  const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
  const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const { toast } = useToast();

  const handleContribute = (projectName: string) => {
    toast({
      title: 'Contribution Received (DEMO)',
      description: `Your contribution to ${projectName} has been recorded. This is a UI demonstration.`,
    });
  };

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
      <main className="flex-1 container mx-auto max-w-screen-xl px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">Token Launchpad</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Be the first to support and invest in the next generation of decentralized projects.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {presaleProjects.map((project) => (
            <Card key={project.name} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Image src={project.icon} alt={`${project.name} logo`} width={56} height={56} className="rounded-full" data-ai-hint="logo" />
                  <div>
                    <CardTitle className="text-2xl">{project.name}</CardTitle>
                    <CardDescription>1 SOL = {(1 / project.price).toLocaleString()} {project.name}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="mb-6 text-sm text-muted-foreground">{project.description}</p>
                
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm font-medium text-muted-foreground">
                        <span>Progress</span>
                        <span><span className="font-bold text-foreground">{project.raised.toLocaleString()}</span> / {project.hardCap.toLocaleString()} SOL</span>
                    </div>
                    <div className="progress-bar-container">
                        <Progress 
                            value={(project.raised / project.hardCap) * 100} 
                            className="h-3"
                        />
                         <div 
                            className="progress-bar-soft-cap" 
                            style={{ left: `${(project.softCap / project.hardCap) * 100}%` }}
                            title={`Soft Cap: ${project.softCap} SOL`}
                         />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Soft Cap: {project.softCap} SOL</span>
                        <span>Hard Cap: {project.hardCap} SOL</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full flex items-center gap-2">
                  <Input type="number" placeholder="SOL Amount" className="flex-1" />
                  <Button onClick={() => handleContribute(project.name)} className="bg-primary hover:bg-primary/90">
                    Contribute
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
      <BottomBar />
    </div>
  );
}
