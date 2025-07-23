
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWallet } from "@solana/wallet-adapter-react";
import { RefreshCw } from "lucide-react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

const FormSchema = z.object({
  price: z.coerce.number().positive({ message: "Price must be positive." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
})

interface Asset {
  id: string;
  name: string;
}
interface LimitOrderFormProps {
  type: 'buy' | 'sell';
  selectedAsset: Asset;
  solBalance?: number;
  psngBalance?: number;
}

const PSNG_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
const DETECT_BALANCE_ENDPOINT = "https://detectbalance-xtgnsf4tla-uc.a.run.app";


export default function LimitOrderForm({ type, selectedAsset, solBalance, psngBalance }: LimitOrderFormProps) {
  const { toast } = useToast()
  const { publicKey } = useWallet();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      price: '' as any,
      amount: '' as any,
    },
  })

  const assetName = selectedAsset.id.split('/')[0];
  const [loadingModal, setLoadingModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  let estimatedTotalSOL = null;
  if (amountInput && priceInput) {
    const amount = Number(amountInput);
    const price = Number(priceInput);
    if (!isNaN(amount) && !isNaN(price) && amount > 0 && price > 0) {
      estimatedTotalSOL = amount * price;
    }
  }

  async function handleSwap(amount: number, price?: number) {
    if (!publicKey) {
      toast({ variant: "destructive", title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    
    const amountToSend = type === 'buy' ? (amount * (price || 0)) : amount;
    
    if (amountToSend <= 0) {
       toast({ variant: "destructive", title: "Invalid Amount", description: "Calculated amount must be positive." });
       return;
    }

    setLoadingModal(true);
    try {
      const response = await fetch("https://swap-xtgnsf4tla-uc.a.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: publicKey.toBase58(),
          direction: type,
          amount: amountToSend 
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: `Limit ${type === 'buy' ? 'Buy' : 'Sell'} Order Submitted`, description: `You ${type === 'buy' ? 'bought' : 'sold'} ${data.amountOut.toFixed(4)} ${type === 'buy' ? assetName : 'SOL'}!` });
        form.reset();
        setAmountInput('');
        setPriceInput('');
      } else {
         throw new Error(data.error || "Unknown error during swap");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: `Order Failed`, description: e.message || String(e) });
    } finally {
        setLoadingModal(false);
    }
  }

  const handleRefreshBalance = async () => {
    if (!publicKey) {
        toast({ variant: "destructive", title: "Error", description: "Please connect your wallet." });
        return;
    }
    const db = getFirestore();
    const userDocRef = doc(db, "users", publicKey.toBase58());
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
       toast({ variant: "destructive", title: "Error", description: "User document not found." });
       return;
    }

    const depositWallet = userDoc.data().depositWallet;
    if (!depositWallet) {
       toast({ variant: "destructive", title: "Error", description: "Deposit wallet not found. Please re-login." });
       return;
    }

    setRefreshing(true);
    try {
        const tokenType = type === 'buy' ? 'SOL' : 'PSNG';
        const body: { userId: string, address: string, tokenType: string, tokenMint?: string } = {
            userId: publicKey.toBase58(),
            address: depositWallet,
            tokenType: tokenType,
        };

        if (tokenType === 'PSNG') {
            body.tokenMint = PSNG_MINT_ADDRESS;
        }

        const response = await fetch(DETECT_BALANCE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || "Failed to refresh balance.");
        }

        toast({ title: `${tokenType} Balance Refresh`, description: "Your balance is being updated." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Refresh Failed", description: e.message || String(e) });
    } finally {
        setRefreshing(false);
    }
  };


  return (
    <>
      <Dialog open={loadingModal}>
        <DialogContent className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <div className="text-center font-semibold">Processing your {type === 'buy' ? 'Buy' : 'Sell'} Order...<br/>Please wait.</div>
        </DialogContent>
      </Dialog>
      <div className="flex items-center mb-2 text-xs text-muted-foreground">
        {type === 'buy' 
          ? `Balance: ${(solBalance ?? 0).toFixed(4)} SOL` 
          : `Balance: ${(psngBalance ?? 0).toFixed(4)} ${assetName}`
        }
         <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={handleRefreshBalance} disabled={refreshing}>
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => handleSwap(data.amount, data.price))} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({assetName})</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0.00000"
                    type="number"
                    step="0.00001"
                    {...field}
                    value={amountInput}
                    onChange={e => {
                      field.onChange(e);
                      setAmountInput(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (SOL per {assetName})</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0.00000"
                    type="number"
                    step="0.00001"
                    {...field}
                    value={priceInput}
                    onChange={e => {
                      field.onChange(e);
                      setPriceInput(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {amountInput && priceInput && estimatedTotalSOL !== null && (
            <div className="text-xs text-primary pt-1 font-semibold">
              Estimated total SOL {type === 'buy' ? 'needed' : 'received'}: {estimatedTotalSOL.toFixed(6)}
            </div>
          )}
          <div className="pt-2">
              <Button type="submit" className={cn("w-full", type === 'buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground')}>
                {type === 'buy' ? `Buy ${assetName}` : `Sell ${assetName}`}
              </Button>
          </div>
        </form>
      </Form>
    </>
  )
}

    