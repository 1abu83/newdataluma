
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AssetInfoBar from '@/components/AssetInfoBar';
import BottomBar from '@/components/BottomBar';
import PriceChart from '@/components/PriceChart';
import TradingForm from '@/components/TradingForm';
import OrderBook from '@/components/OrderBook';
import OrderHistory from '@/components/OrderHistory';
import DrawingToolbar from '@/components/DrawingToolbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import WalletSetupDialog from '@/components/WalletSetupDialog';
import WalletWithdrawDialog from '@/components/WalletWithdrawDialog';
import { getFirestore, doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { useWallet } from '@solana/wallet-adapter-react';
import { app } from '@/lib/firebase';

// Mock data structure, will be replaced with real data
type Asset = {
  id: string;
  name: string;
  icon: { src: string, alt: string };
  price: number;
  change: number;
  volume: number;
  marketCap: number;
  holders: number;
};

type Trade = {
  date: string;
  pair: string;
  type: 'Buy' | 'Sell';
  price: number;
  amount: number;
  total: number;
};


const initialAssets: Asset[] = [
    { 
        id: 'PSNG/SOL', 
        name: 'Pasino', 
        icon: { src: '/psng.png', alt: 'Pasino Logo' }, 
        price: 0.00005123, 
        change: 2.5, 
        volume: 5_200_000, 
        marketCap: 17_000_000,
        holders: 4200 
    },
];

export default function MarketPage() {
  const [isMarketBarOpen, setMarketBarOpen] = useState(false);
  const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
  const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(assets[0]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const isMobile = useIsMobile();
  const { publicKey } = useWallet();

  const [solBalance, setSolBalance] = useState<number>(0);
  const [psngBalance, setPsngBalance] = useState<number>(0);

  // Listen to price changes
  useEffect(() => {
    const db = getFirestore(app);
    const poolRef = doc(db, "pools", "PSNG_SOL");

    const unsubscribe = onSnapshot(poolRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const newPrice = data.reserveSOL / data.reservePSNG;
        
        setAssets(prevAssets => prevAssets.map(asset => 
            asset.id === 'PSNG/SOL' ? { ...asset, price: newPrice } : asset
        ));
        setSelectedAsset(prevAsset => 
            prevAsset.id === 'PSNG/SOL' ? { ...prevAsset, price: newPrice } : prevAsset
        );
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to user balance changes
  useEffect(() => {
    if (!publicKey) return;
    const db = getFirestore(app);
    
    const solUnsub = onSnapshot(doc(db, "users", publicKey.toBase58(), "balances", "SOL"), (doc) => {
      setSolBalance(doc.exists() ? doc.data().amount : 0);
    });

    const psngUnsub = onSnapshot(doc(db, "users", publicKey.toBase58(), "balances", "PSNG"), (doc) => {
      setPsngBalance(doc.exists() ? doc.data().amount : 0);
    });

    return () => {
      solUnsub();
      psngUnsub();
    };
  }, [publicKey]);

  // Listen to trade history
    useEffect(() => {
        const db = getFirestore(app);
        const swapsQuery = query(collection(db, "swaps"), orderBy("timestamp", "desc"), limit(50));

        const unsubscribe = onSnapshot(swapsQuery, (snapshot) => {
            const history = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    date: (data.timestamp?.toDate() ?? new Date()).toISOString(),
                    pair: `${data.tokenIn}/${data.tokenOut}`, // This might need adjustment based on your data
                    type: data.direction === 'buy' ? 'Buy' : 'Sell',
                    price: data.exchangeRate,
                    amount: data.amountIn, // Or amountOut depending on perspective
                    total: data.amountIn * data.exchangeRate
                };
            });
            setTradeHistory(history);
        });

        return () => unsubscribe();
    }, []);


  const handleAssetChange = (asset: Asset) => {
    setSelectedAsset(asset);
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
      
      <AssetInfoBar 
        assets={assets}
        selectedAsset={selectedAsset}
        onAssetChange={handleAssetChange}
        onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
      />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 overflow-hidden">
            
            <div className="flex-1 flex flex-row gap-2 md:gap-4 overflow-hidden">
                 <div className="hidden md:flex items-center justify-center">
                    <DrawingToolbar />
                </div>
                <div className="flex-1 flex flex-col gap-2 md:gap-4 overflow-hidden">
                    <PriceChart />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4 h-full min-h-0">
                        <TradingForm 
                          type="buy" 
                          selectedAsset={selectedAsset} 
                          solBalance={solBalance} 
                          psngBalance={psngBalance}
                        />
                        <TradingForm 
                          type="sell" 
                          selectedAsset={selectedAsset} 
                          solBalance={solBalance} 
                          psngBalance={psngBalance} 
                        />
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 flex flex-col gap-2 md:gap-4 h-full overflow-y-auto [scrollbar-width:none]">
               {isMobile ? (
                 <Sheet>
                   <SheetTrigger className="text-center w-full bg-muted p-2 rounded-md">Show Order Book & History</SheetTrigger>
                   <SheetContent side="bottom" className="h-[70%] p-2">
                      <div className="flex flex-col gap-2 h-full">
                         <OrderBook selectedAsset={selectedAsset} />
                         <OrderHistory selectedAsset={selectedAsset} tradeHistory={tradeHistory} />
                      </div>
                   </SheetContent>
                 </Sheet>
               ) : (
                <>
                  <OrderBook selectedAsset={selectedAsset} />
                  <OrderHistory selectedAsset={selectedAsset} tradeHistory={tradeHistory} />
                </>
               )}
            </div>
        </div>
      </main>
      
      <BottomBar />
    </div>
  );
}


