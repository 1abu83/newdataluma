
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import BottomBar from '@/components/BottomBar';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import WalletWithdrawDialog from '@/components/WalletWithdrawDialog';
import { useWallet } from '@solana/wallet-adapter-react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUpRight, Copy, ExternalLink, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Asset {
  id: string;
  name: string;
  icon: string;
  amount: number;
  value: number;
  price: number;
  change: number;
}

export default function DashboardPage() {
  const [isMarketBarOpen, setMarketBarOpen] = useState(false);
  const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
  const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();

  const [solBalance, setSolBalance] = useState<number>(0);
  const [psngBalance, setPsngBalance] = useState<number>(0);
  const [psngPrice, setPsngPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Listen for authentication state
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Listen for asset price (PSNG)
    useEffect(() => {
        const db = getFirestore(app);
        const poolRef = doc(db, "pools", "PSNG_SOL");
        const unsubscribe = onSnapshot(poolRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setPsngPrice(data.reserveSOL / data.reservePSNG);
            }
        });
        return () => unsubscribe();
    }, []);

  // Listen for user balances
  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    const db = getFirestore(app);
    
    const solUnsub = onSnapshot(doc(db, "users", publicKey.toBase58(), "balances", "SOL"), (doc) => {
      setSolBalance(doc.exists() ? doc.data().amount : 0);
      setLoading(false);
    });

    const psngUnsub = onSnapshot(doc(db, "users", publicKey.toBase58(), "balances", "PSNG"), (doc) => {
      setPsngBalance(doc.exists() ? doc.data().amount : 0);
      setLoading(false);
    });

    return () => {
      solUnsub();
      psngUnsub();
    };
  }, [publicKey]);

  const portfolioValue = solBalance + (psngBalance * psngPrice);

  const assets: Asset[] = [
    { id: 'SOL', name: 'Solana', icon: '/sol.png', amount: solBalance, value: solBalance, price: 1, change: 0 },
    { id: 'PSNG', name: 'Pasino', icon: '/psng.png', amount: psngBalance, value: psngBalance * psngPrice, price: psngPrice, change: 0 },
  ];
   const lumadexTokens = [
    { id: 'PSNG', name: 'Pasino', icon: '/psng.png', price: psngPrice, marketCap: 2300000 },
    { id: 'LUMA', name: 'Luma', icon: '/lu.png', price: 0.0001, marketCap: 100000 },
    { id: 'BRICS', name: 'Brics', icon: '/br.png', price: 0.00025, marketCap: 500000 },
    { id: 'BLC', name: 'BlockChain', icon: '/bl.png', price: 0.0005, marketCap: 1250000 },
  ];

  const handleCopyAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    toast({
      title: 'Address Copied!',
      description: 'Your wallet address has been copied to the clipboard.',
    });
  };

  const renderContent = () => {
    if (loading) {
      return <DashboardSkeleton />;
    }

    if (!connected || !publicKey) {
      return (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
          <p className="mt-2 text-muted-foreground">Please connect your wallet to view your dashboard and portfolio.</p>
        </div>
      );
    }
  
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Portfolio */}
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/profil.png" alt="User Avatar" />
                  <AvatarFallback>{publicKey.toBase58().slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">My Profile</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground truncate">{`${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyAddress}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Portfolio</CardTitle>
              <CardDescription>A summary of your assets held on LUMADEX.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                ${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total value in USD</p>
              
              <div className="space-y-4 mt-6">
                {assets.filter(a => a.amount > 0).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Image src={asset.icon} alt={`${asset.name} logo`} width={32} height={32} />
                      <div>
                        <div className="font-semibold">{asset.name}</div>
                        <div className="text-sm text-muted-foreground">{asset.amount.toLocaleString()} {asset.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="font-semibold">${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                       <div className="text-sm text-muted-foreground">@{asset.price.toFixed(8)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: LUMADEX Tokens */}
        <div className="lg:col-span-2">
           <Card>
            <CardHeader>
              <CardTitle>LUMADEX Tokens</CardTitle>
              <CardDescription>All tokens available for trading on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="hidden md:table-cell">Market Cap</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lumadexTokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Image src={token.icon} alt={`${token.name} logo`} width={32} height={32} />
                          <div>
                            <div className="font-semibold">{token.name}</div>
                            <div className="text-sm text-muted-foreground">{token.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        ${token.marketCap.toLocaleString()}
                      </TableCell>
                       <TableCell className="text-right">
                        <Link href="/trade">
                            <Button variant="outline" size="sm">
                                Trade
                                <ArrowUpRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
        {renderContent()}
      </main>
      <BottomBar />
    </div>
  );
}


function DashboardSkeleton() {
    return (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                         </div>
                    </CardHeader>
                </Card>
                 <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-60 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-12 w-1/2" />
                        <div className="space-y-4 mt-6">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
         </div>
    );
}
