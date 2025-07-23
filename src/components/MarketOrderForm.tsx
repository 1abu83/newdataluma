
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWallet } from "@solana/wallet-adapter-react";

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
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
})

interface Asset {
  id: string;
  name: string;
  price: number;
}

interface MarketOrderFormProps {
  type: 'buy' | 'sell';
  selectedAsset: Asset;
  solBalance?: number;
  psngBalance?: number;
}

export default function MarketOrderForm({ type, selectedAsset, solBalance, psngBalance }: MarketOrderFormProps) {
  const { toast } = useToast()
  const { publicKey } = useWallet();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      amount: '' as any,
    },
  })

  const assetName = selectedAsset.id.split('/')[0];
  const [loadingModal, setLoadingModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const FEE = 0.02; // This is a client-side estimation, the backend fee is the source of truth

  // Estimasi jumlah yang didapat
  let estimatedReceived = null;
  if (amountInput) {
    const amount = Number(amountInput);
    if (!isNaN(amount) && amount > 0) {
      if (type === 'buy') {
        // Buy: user isi amount SOL, dapat PSNG
        const price = selectedAsset.price;
        estimatedReceived = (amount / price) * (1 - FEE);
      } else {
        // Sell: user isi amount PSNG, dapat SOL
        const price = selectedAsset.price;
        estimatedReceived = amount * price * (1 - FEE);
      }
    }
  }
  
  async function handleSwap(amount: number) {
    if (!publicKey) {
      toast({ variant: "destructive", title: "Wallet not connected", description: "Please connect your wallet first." });
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
          amount: Number(amount)
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast({ title: `${type === 'buy' ? 'Buy' : 'Sell'} Success`, description: `You ${type === 'buy' ? 'bought' : 'sold'} ${data.amountOut.toFixed(4)} ${type === 'buy' ? assetName : 'SOL'}!` });
        form.reset();
        setAmountInput('');
      } else {
        throw new Error(data.error || "Unknown error during swap");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: `${type === 'buy' ? 'Buy' : 'Sell'} Failed`, description: e.message || String(e) });
    } finally {
        setLoadingModal(false);
    }
  }


  return (
    <>
      <Dialog open={loadingModal}>
        <DialogContent className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <div className="text-center font-semibold">Processing your {type === 'buy' ? 'Buy' : 'Sell'} Order...<br/>Please wait.</div>
        </DialogContent>
      </Dialog>
       <div className="mb-2 text-xs text-muted-foreground">
        {type === 'buy' 
          ? `Balance: ${(solBalance ?? 0).toFixed(4)} SOL` 
          : `Balance: ${(psngBalance ?? 0).toFixed(4)} ${assetName}`
        }
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => handleSwap(data.amount))} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({type === 'buy' ? 'SOL' : assetName})</FormLabel>
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
                {amountInput && estimatedReceived !== null && (
                  <div className="text-xs text-primary pt-1 font-semibold">
                    Estimated {type === 'buy' ? assetName : 'SOL'} received: {estimatedReceived.toFixed(6)}
                  </div>
                )}
              </FormItem>
            )}
          />
          <div className="pt-2">
             <Button type="submit" className={cn("w-full", type === 'buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground')}>
                {type === 'buy' ? `Buy ${assetName} at Market` : `Sell ${assetName} at Market`}
              </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
