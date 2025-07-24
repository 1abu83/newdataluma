
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
  onSwap?: (amount: number, price?: number) => Promise<void>;
  solBalance?: number;
  psngBalance?: number;
}

export default function LimitOrderForm({ type, selectedAsset, onSwap, solBalance, psngBalance }: LimitOrderFormProps) {
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

  // Estimasi total SOL yang dibutuhkan/didapat
  let estimatedTotalSOL = null;
  if (amountInput && priceInput) {
    const amount = Number(amountInput);
    const price = Number(priceInput);
    if (!isNaN(amount) && !isNaN(price) && amount > 0 && price > 0) {
      estimatedTotalSOL = amount * price;
    }
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (onSwap) {
      setLoadingModal(true);
      try {
        // Untuk limit order, kirim amount dan price ke backend jika perlu
        await onSwap(Number(data.amount), Number(data.price));
      } finally {
        setLoadingModal(false);
      }
    }
    form.reset();
    setAmountInput('');
    setPriceInput('');
  }

  return (
    <>
      <Dialog open={loadingModal}>
        <DialogContent className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <div className="text-center font-semibold">Processing your {type === 'buy' ? 'Buy' : 'Sell'} Order...<br/>Please wait.</div>
        </DialogContent>
      </Dialog>
      {/* Tampilkan saldo di atas form */}
      {type === 'buy' && solBalance !== undefined && (
        <div className="mb-2 text-xs text-success font-semibold">Your SOL Balance: {solBalance.toFixed(4)}</div>
      )}
      {type === 'sell' && psngBalance !== undefined && (
        <div className="mb-2 text-xs text-success font-semibold">Your PSNG Balance: {psngBalance.toFixed(4)}</div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (PSNG)</FormLabel>
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
                <FormLabel>Price (SOL per PSNG)</FormLabel>
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

    