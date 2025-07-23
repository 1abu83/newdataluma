
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  onSwap?: (amount: number) => Promise<void>;
  solBalance?: number;
  psngBalance?: number;
}

export default function MarketOrderForm({ type, selectedAsset, onSwap, solBalance, psngBalance }: MarketOrderFormProps) {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      amount: '' as any,
    },
  })

  const assetName = selectedAsset.id.split('/')[0];
  const [loadingModal, setLoadingModal] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const FEE = 0.02;

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

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (onSwap) {
      setLoadingModal(true);
      const loadingTimeout = setTimeout(() => setLoadingModal(false), 5000);
      try {
        await onSwap(Number(data.amount));
      } finally {
        clearTimeout(loadingTimeout);
        setLoadingModal(false);
      }
    } else {
       toast({ title: "OnSwap function not provided" });
    }
    form.reset();
    setAmountInput('');
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
          : `Balance: ${(psngBalance ?? 0).toFixed(4)} PSNG`
        }
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
