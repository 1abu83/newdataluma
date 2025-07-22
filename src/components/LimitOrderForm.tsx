
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
  onTrade: (price: number, type: 'buy' | 'sell') => void;
}

export default function LimitOrderForm({ type, selectedAsset, onTrade }: LimitOrderFormProps) {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      price: '' as any,
      amount: '' as any,
    },
  })

  const assetName = selectedAsset.id.split('/')[0];
  const currencyName = selectedAsset.id.split('/')[1];


  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "Limit Order Submitted",
      description: `Your ${type} order for ${data.amount} ${assetName} at ${data.price.toFixed(2)} ${currencyName} has been placed.`,
    })
    onTrade(data.price, type);
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price ({currencyName})</FormLabel>
              <FormControl>
                <Input placeholder="0.00" type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
              {type === 'buy' ? `Buy ${assetName}` : `Sell ${assetName}`}
            </Button>
        </div>
      </form>
    </Form>
  )
}
