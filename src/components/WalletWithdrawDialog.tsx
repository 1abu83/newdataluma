
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
import { useState, useEffect } from "react"
import { getAuth } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase"; // Import the initialized app

// Ganti dengan endpoint backend Anda
const API_BASE = "https://generatechallenge-xtgnsf4tla-uc.a.run.app".replace(/\/generatechallenge$/, "");

interface WalletWithdrawDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletWithdrawDialog({ isOpen, onOpenChange }: WalletWithdrawDialogProps) {
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [psngBalance, setPsngBalance] = useState<number | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");

  // Ambil saldo dari Firestore setelah dialog dibuka
  async function fetchBalances(userId: string) {
    try {
      const db = getFirestore(app);
      const solDoc = await getDoc(doc(db, "users", userId, "balances", "SOL"));
      const psngDoc = await getDoc(doc(db, "users", userId, "balances", "PSNG"));
      setSolBalance(solDoc.exists() ? solDoc.data().amount : 0);
      setPsngBalance(psngDoc.exists() ? psngDoc.data().amount : 0);
    } catch (e) {
      setSolBalance(null);
      setPsngBalance(null);
    }
  }

  // Cek status login
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      if (user && publicKey) {
        fetchBalances(publicKey.toBase58());
      }
    });
    return () => unsubscribe();
  }, [publicKey]);

  // Panggil fetchBalances setelah dialog dibuka
  useEffect(() => {
    if (isOpen && isLoggedIn && publicKey) {
      fetchBalances(publicKey.toBase58());
    }
  }, [isOpen, isLoggedIn, publicKey]);

  // Fungsi untuk menangani withdraw
  const handleWithdraw = async (token: string) => {
    if (!publicKey || !withdrawAddress || !withdrawAmount) {
      toast({ 
        title: "Input Error", 
        description: "Please enter a valid amount and destination address." 
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ 
        title: "Invalid Amount", 
        description: "Please enter a valid amount greater than zero." 
      });
      return;
    }

    // Validasi saldo
    const currentBalance = token === "SOL" ? solBalance : psngBalance;
    if (currentBalance === null || amount > currentBalance) {
      toast({ 
        title: "Insufficient Balance", 
        description: `Your ${token} balance is not enough for this withdrawal.` 
      });
      return;
    }

    setLoading(true);
    try {
      // Panggil endpoint withdraw
      const response = await fetch(`${API_BASE}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          token,
          amount,
          destinationAddress: withdrawAddress
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process withdrawal');
      }
      
      // Refresh saldo setelah withdraw berhasil
      fetchBalances(publicKey.toBase58());
      
      toast({ 
        title: "Withdraw Successful", 
        description: data.message || `Your withdrawal of ${amount} ${token} has been processed.` 
      });
      
      // Reset form
      setWithdrawAmount("");
      setWithdrawAddress("");
      
      // Tutup dialog
      onOpenChange(false);
    } catch (e: any) {
      toast({ 
        title: "Withdraw Failed", 
        description: e.message || String(e) 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-[95%] sm:max-w-[425px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            {isLoggedIn ? (
              <>Select the token you wish to withdraw and enter the destination address.</>
            ) : (
              <>You must be logged in to withdraw funds.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {!isLoggedIn ? (
            <div className="text-center py-4">
              <p className="mb-4 text-xs sm:text-sm">Please connect your wallet and login to access withdrawal features.</p>
              <Button disabled={true} className="w-full mb-4 text-xs sm:text-sm py-1 sm:py-2">
                Login Required
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="sol" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 sm:h-10">
                <TabsTrigger value="sol" className="text-xs sm:text-sm py-0">SOL</TabsTrigger>
                <TabsTrigger value="psng" className="text-xs sm:text-sm py-0">PSNG</TabsTrigger>
              </TabsList>
              <TabsContent value="sol" className="pt-4 space-y-2">
                {solBalance !== null && (
                  <div className="text-xs sm:text-sm mb-4">Available Balance: <span className="font-medium">{solBalance} SOL</span></div>
                )}
                <Label htmlFor="sol-withdraw-amount" className="text-xs sm:text-sm">Amount to Withdraw</Label>
                <Input 
                  id="sol-withdraw-amount" 
                  type="number" 
                  placeholder="0.0" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="0"
                  step="0.000001"
                  max={solBalance?.toString() || "0"}
                  className="text-xs sm:text-sm"
                />
                <Label htmlFor="sol-withdraw-address" className="mt-4 text-xs sm:text-sm">Destination Address</Label>
                <Input 
                  id="sol-withdraw-address" 
                  placeholder="Enter SOL address" 
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="text-xs sm:text-sm"
                />
                <Button 
                  className="w-full mt-4 text-xs sm:text-sm py-1 sm:py-2" 
                  onClick={() => handleWithdraw("SOL")} 
                  disabled={loading || !withdrawAmount || !withdrawAddress}
                >
                  {loading ? "Processing..." : "Withdraw SOL"}
                </Button>
                <p className="text-xs text-muted-foreground pt-1">Withdrawals may take a few minutes to process.</p>
              </TabsContent>
              <TabsContent value="psng" className="pt-4 space-y-2">
                {psngBalance !== null && (
                  <div className="text-xs sm:text-sm mb-4">Available Balance: <span className="font-medium">{psngBalance} PSNG</span></div>
                )}
                <Label htmlFor="psng-withdraw-amount" className="text-xs sm:text-sm">Amount to Withdraw</Label>
                <Input 
                  id="psng-withdraw-amount" 
                  type="number" 
                  placeholder="0.0" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="0"
                  step="1"
                  max={psngBalance?.toString() || "0"}
                  className="text-xs sm:text-sm"
                />
                <Label htmlFor="psng-withdraw-address" className="mt-4 text-xs sm:text-sm">Destination Address</Label>
                <Input 
                  id="psng-withdraw-address" 
                  placeholder="Enter PSNG address" 
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="text-xs sm:text-sm"
                />
                <Button 
                  className="w-full mt-4 text-xs sm:text-sm py-1 sm:py-2" 
                  onClick={() => handleWithdraw("PSNG")} 
                  disabled={loading || !withdrawAmount || !withdrawAddress}
                >
                  {loading ? "Processing..." : "Withdraw PSNG"}
                </Button>
                <p className="text-xs text-muted-foreground pt-1">Withdrawals may take a few minutes to process.</p>
              </TabsContent>
            </Tabs>
          )}
          <div className="text-[10px] sm:text-xs text-center text-muted-foreground pt-4">
            Withdrawal requests are processed securely on the blockchain.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs sm:text-sm py-1 sm:py-2">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
