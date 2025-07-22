
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"

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
  onTrade: (price: number, type: 'buy' | 'sell') => void;
}

export default function MarketOrderForm({ type, selectedAsset, onTrade }: MarketOrderFormProps) {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      amount: '' as any,
    },
  })

  const assetName = selectedAsset.id.split('/')[0];

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "Market Order Submitted",
      description: `Your market ${type} order for ${data.amount} ${assetName} has been placed.`,
    })
    // For a market order, we use the current asset price for the marker
    onTrade(selectedAsset.price, type);
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ({assetName})</FormLabel>
              <FormControl>
                <Input placeholder="0.00000" type="number" step="0.00001" {...field} />
              </FormControl>
              <FormMessage />
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
  )
}
