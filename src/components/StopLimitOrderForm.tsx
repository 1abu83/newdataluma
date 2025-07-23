
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
  stopPrice: z.coerce.number().positive({ message: "Stop price must be positive." }),
  limitPrice: z.coerce.number().positive({ message: "Limit price must be positive." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
})

interface Asset {
  id: string;
  name: string;
}

interface StopLimitOrderFormProps {
  type: 'buy' | 'sell';
  selectedAsset: Asset;
  solBalance?: number;
  psngBalance?: number;
}

export default function StopLimitOrderForm({ type, selectedAsset, solBalance, psngBalance }: StopLimitOrderFormProps) {
  const { toast } = useToast()
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      stopPrice: '' as any,
      limitPrice: '' as any,
      amount: '' as any,
    },
  })

  const assetName = selectedAsset.id.split('/')[0];
  const currencyName = selectedAsset.id.split('/')[1];

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "Stop-Limit Order Submitted",
      description: `Your ${type} order for ${data.amount} ${assetName} has been placed. (This is a mock-up and not functional yet)`,
    })
    form.reset()
  }

  return (
    <>
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
            name="stopPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stop Price ({currencyName})</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="limitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit Price ({currencyName})</FormLabel>
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
                {type === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
              </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
