
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet } from "@solana/wallet-adapter-react"
import { useToast } from "@/hooks/use-toast"
import { Copy } from "lucide-react"

interface WalletSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletSetupDialog({ isOpen, onOpenChange }: WalletSetupDialogProps) {
  const { publicKey } = useWallet();
  const { toast } = useToast();

  const solDepositAddress = "SOLdepositWALLETaddressGoesHERE111111111111";
  const psngDepositAddress = "PSNGdepositWALLETaddressGoesHERE222222222222";


  const handleCopyAddress = (address: string, token: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: `${token} Address Copied!`,
      description: `The ${token} deposit address has been copied to your clipboard.`,
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Select the token you wish to deposit. Send funds only to the corresponding address.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
            <Tabs defaultValue="sol" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sol">SOL</TabsTrigger>
                  <TabsTrigger value="psng">PSNG</TabsTrigger>
              </TabsList>
              <TabsContent value="sol" className="pt-4 space-y-2">
                  <Label htmlFor="sol-deposit-address">SOL Deposit Address</Label>
                  <div className="flex items-center gap-2">
                      <Input id="sol-deposit-address" value={solDepositAddress} readOnly />
                      <Button variant="outline" size="icon" onClick={() => handleCopyAddress(solDepositAddress, 'SOL')}>
                      <Copy className="h-4 w-4" />
                      </Button>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">Send only native SOL to this address.</p>
              </TabsContent>
              <TabsContent value="psng" className="pt-4 space-y-2">
                  <Label htmlFor="psng-deposit-address">PSNG Deposit Address</Label>
                  <div className="flex items-center gap-2">
                      <Input id="psng-deposit-address" value={psngDepositAddress} readOnly />
                      <Button variant="outline" size="icon" onClick={() => handleCopyAddress(psngDepositAddress, 'PSNG')}>
                      <Copy className="h-4 w-4" />
                      </Button>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">Send only PSNG tokens to this address.</p>
              </TabsContent>
            </Tabs>
            
              <div className="text-xs text-center text-muted-foreground pt-4">
              Your funds will be credited after network confirmation.
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
