
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MarketOrderForm from "./MarketOrderForm"
import LimitOrderForm from "./LimitOrderForm"
import StopLimitOrderForm from "./StopLimitOrderForm"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import { getAuth } from "firebase/auth"
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc, onSnapshot } from "firebase/firestore";
import { app } from "@/lib/firebase";

interface Asset {
  id: string;
  name: string;
  price: number;
}

interface TradingFormProps {
  type: 'buy' | 'sell';
  selectedAsset: Asset;
  onTrade: (price: number, type: 'buy' | 'sell') => void;
}

const SWAP_FUNCTION_URL = "https://swap-xtgnsf4tla-uc.a.run.app";

export default function TradingForm({ type, selectedAsset, onTrade }: TradingFormProps) {
  const assetName = selectedAsset.id.split('/')[0];
  const title = type === 'buy' ? `Buy ${assetName}` : `Sell ${assetName}`;
  const titleClass = type === 'buy' ? 'text-success' : 'text-destructive';
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [poolReserveSOL, setPoolReserveSOL] = useState<number | undefined>(undefined);
  const [poolReservePSNG, setPoolReservePSNG] = useState<number | undefined>(undefined);
  const [solBalance, setSolBalance] = useState<number | undefined>(undefined);
  const [psngBalance, setPsngBalance] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!publicKey) return;

    const db = getFirestore(app);
    const solBalanceRef = doc(db, "users", publicKey.toBase58(), "balances", "SOL");
    const psngBalanceRef = doc(db, "users", publicKey.toBase58(), "balances", "PSNG");

    const unsubSol = onSnapshot(solBalanceRef, (doc) => {
      setSolBalance(doc.exists() ? doc.data().amount : 0);
    });
    const unsubPsng = onSnapshot(psngBalanceRef, (doc) => {
      setPsngBalance(doc.exists() ? doc.data().amount : 0);
    });

    return () => {
      unsubSol();
      unsubPsng();
    };
  }, [publicKey]);

  useEffect(() => {
    const db = getFirestore(app);
    const poolRef = doc(db, "pools", "PSNG_SOL");

    const unsubPool = onSnapshot(poolRef, (doc) => {
      if (doc.exists()) {
        setPoolReserveSOL(doc.data().reserveSOL);
        setPoolReservePSNG(doc.data().reservePSNG);
      }
    });

    return () => unsubPool();
  }, []);

  async function handleSwap(amount: number, price?: number) {
    if (!publicKey) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    // Limit order (simple version) is treated as a market order for now if price is not passed
    // A real limit order would need a backend service to monitor prices
    const body: any = {
      userId: publicKey.toBase58(),
      direction: type,
      amount: Number(amount),
    };

    if (price) {
      // Logic for limit order if backend supports it. For now, we ignore it.
      // This is a placeholder for a more complex limit order implementation.
    }

    try {
      const response = await fetch(SWAP_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: `${type === 'buy' ? 'Buy' : 'Sell'} Success`, description: `You ${type === 'buy' ? 'bought' : 'sold'} ${data.amountOut.toFixed(4)} ${type === 'buy' ? assetName : 'SOL'}.` });
        onTrade(data.exchangeRate, type); // Update chart marker
      } else {
        toast({ variant: "destructive", title: `${type === 'buy' ? 'Buy' : 'Sell'} Failed`, description: data.error || "Unknown error" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: `${type === 'buy' ? 'Buy' : 'Sell'} Failed`, description: e.message || String(e) });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={titleClass}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="limit" className="w-full">
          <TabsList className="grid w-full grid-cols-4 text-xs h-auto">
            <TabsTrigger value="limit">Limit</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="stop-limit">Stop-Limit</TabsTrigger>
            <TabsTrigger value="trailing-stop" disabled>Trailing</TabsTrigger>
          </TabsList>
          <TabsContent value="limit" className="pt-4">
            <LimitOrderForm
              type={type}
              selectedAsset={selectedAsset}
              onTrade={onTrade}
              onSwap={handleSwap}
              poolReserveSOL={poolReserveSOL}
              poolReservePSNG={poolReservePSNG}
              solBalance={solBalance}
              psngBalance={psngBalance}
            />
          </TabsContent>
          <TabsContent value="market" className="pt-4">
            <MarketOrderForm type={type} selectedAsset={selectedAsset} onTrade={onTrade} onSwap={handleSwap} />
          </TabsContent>
          <TabsContent value="stop-limit" className="pt-4">
            <StopLimitOrderForm type={type} selectedAsset={selectedAsset} onTrade={onTrade} />
          </TabsContent>
          <TabsContent value="trailing-stop" className="pt-4">
            {/* Trailing Stop Form will go here */}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
