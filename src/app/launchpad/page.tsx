
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import BottomBar from '@/components/BottomBar';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import WalletWithdrawDialog from '@/components/WalletWithdrawDialog';
import './launchpad.css';
import Link from 'next/link';
import { presaleProjects } from '@/lib/launchpad-data';

export default function LaunchpadPage() {
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
                <p className="mb-6 text-sm text-muted-foreground">{project.shortDescription}</p>
                
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
                 <Link href={`/launchpad/${project.slug}`} className="w-full">
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      View Project
                    </Button>
                  </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
      <BottomBar />
    </div>
  );
}
