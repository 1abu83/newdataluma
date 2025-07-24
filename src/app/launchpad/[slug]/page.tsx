
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
import { presaleProjects } from '@/lib/launchpad-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Twitter, Send, Globe, Users, Target } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import '../launchpad.css';


export default function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const [isMarketBarOpen, setMarketBarOpen] = useState(false);
  const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
  const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const { toast } = useToast();

  const project = presaleProjects.find((p) => p.slug === params.slug);

  if (!project) {
    notFound();
  }

  const handleContribute = (projectName: string) => {
    toast({
      title: 'Contribution Received (DEMO)',
      description: `Your contribution to ${projectName} has been recorded. This is a UI demonstration.`,
    });
  };

  const progressPercentage = (project.raised / project.hardCap) * 100;

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
      <main className="flex-1 container mx-auto max-w-screen-lg px-4 py-8 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                 <Image src={project.icon} alt={`${project.name} logo`} width={64} height={64} className="rounded-full" data-ai-hint="logo" />
                 <div>
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <p className="text-muted-foreground">{project.tagline}</p>
                 </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{project.longDescription}</p>

                <Separator className="my-6" />

                <h3 className="text-xl font-semibold mb-4">Tokenomics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {Object.entries(project.tokenomics).map(([key, value]) => (
                        <div key={key} className="bg-muted/50 p-3 rounded-lg">
                            <div className="text-muted-foreground capitalize">{key.replace('_', ' ')}</div>
                            <div className="font-semibold text-foreground">{value}</div>
                        </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="md:col-span-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Join the Presale</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                            <span>Progress</span>
                            <span><span className="font-bold text-foreground">{project.raised.toLocaleString()}</span> / {project.hardCap.toLocaleString()} SOL</span>
                        </div>
                        <div className="progress-bar-container">
                            <Progress 
                                value={progressPercentage} 
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
                     <div className="w-full flex items-center gap-2 mt-6">
                      <Input type="number" placeholder="SOL Amount" className="flex-1" />
                      <Button onClick={() => handleContribute(project.name)} className="bg-primary hover:bg-primary/90">
                        Contribute
                      </Button>
                    </div>
                    <div className="text-center text-xs text-muted-foreground mt-4">
                        1 SOL = {(1 / project.price).toLocaleString()} {project.name}
                    </div>
                </CardContent>
             </Card>

             <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Participants</span>
                         </div>
                         <div className="font-bold text-foreground">{project.participants.toLocaleString()}</div>
                    </div>
                     <Separator />
                     <div className="flex items-center justify-between mt-4">
                         <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span>Token Price</span>
                         </div>
                         <div className="font-bold text-foreground">{project.price} SOL</div>
                    </div>
                </CardContent>
             </Card>
             
             <Card>
                 <CardHeader>
                    <CardTitle>Community</CardTitle>
                 </CardHeader>
                 <CardContent className="flex items-center justify-around">
                    <Link href={project.socials.twitter} target="_blank" className="text-muted-foreground hover:text-foreground"><Twitter className="h-6 w-6" /></Link>
                    <Link href={project.socials.telegram} target="_blank" className="text-muted-foreground hover:text-foreground"><Send className="h-6 w-6" /></Link>
                    <Link href={project.socials.website} target="_blank" className="text-muted-foreground hover:text-foreground"><Globe className="h-6 w-6" /></Link>
                 </CardContent>
             </Card>
          </div>
        </div>
      </main>
      <BottomBar />
    </div>
  );
}
