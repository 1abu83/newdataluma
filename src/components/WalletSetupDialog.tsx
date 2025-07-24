
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
import { useState, useEffect } from "react"
import { getAuth, signInWithCustomToken } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase"; // Import the initialized app

// Ganti dengan endpoint backend Anda
const API_BASE = "https://generatechallenge-xtgnsf4tla-uc.a.run.app".replace(/\/generatechallenge$/, "");
const ENDPOINTS = {
  challenge: "https://generatechallenge-xtgnsf4tla-uc.a.run.app", // tidak dipakai lagi
  loginOrSignup: "https://loginorsignup-xtgnsf4tla-uc.a.run.app"
};

interface WalletSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletSetupDialog({ isOpen, onOpenChange }: WalletSetupDialogProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [depositWallet, setDepositWallet] = useState<string>("");
  const [psngDepositWallet, setPsngDepositWallet] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [psngBalance, setPsngBalance] = useState<number | null>(null);

  // Ambil saldo dari Firestore setelah login sukses
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

  // Panggil fetchBalances setelah login sukses
  useEffect(() => {
    if (isLoggedIn && publicKey) {
      fetchBalances(publicKey.toBase58());
    }
  }, [isLoggedIn, publicKey]);

  const handleCopyAddress = (address: string, token: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: `${token} Address Copied!`,
      description: `The ${token} deposit address has been copied to your clipboard.`,
    });
  };

  // Proses login/register wallet tanpa signature/challenge
  const handleLoginWithWallet = async () => {
    if (!publicKey) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    setLoading(true);
    try {
      // 1. Login/signup hanya dengan walletAddress
      const loginRes = await fetch(ENDPOINTS.loginOrSignup, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || "Failed to login/signup");

      // 2. Login ke Firebase Auth
      const auth = getAuth(app);
      await signInWithCustomToken(auth, loginData.customToken);
      setIsLoggedIn(true);
      setDepositWallet(loginData.depositWallet || "");
      setPsngDepositWallet(loginData.depositWallet || ""); // Untuk demo, sama dengan depositWallet
      toast({ title: "Login Success", description: "Wallet authenticated and deposit address loaded." });
    } catch (e: any) {
      toast({ title: "Login Failed", description: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-[95%] sm:max-w-[425px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            {isLoggedIn ? (
              <>Select the token you wish to deposit. Send funds only to the corresponding address.</>
            ) : (
              <>You must login/register with your wallet to get your deposit address.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {!isLoggedIn ? (
            <Button onClick={handleLoginWithWallet} disabled={loading || !connected} className="w-full mb-4 text-xs sm:text-sm py-1 sm:py-2">
              {loading ? "Authenticating..." : "Login/Register with Wallet"}
            </Button>
          ) : (
            <Tabs defaultValue="sol" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8 sm:h-10">
                <TabsTrigger value="sol" className="text-xs sm:text-sm py-0">SOL</TabsTrigger>
                <TabsTrigger value="psng" className="text-xs sm:text-sm py-0">PSNG</TabsTrigger>
              </TabsList>
              <TabsContent value="sol" className="pt-4 space-y-2">
                <Label htmlFor="sol-deposit-address" className="text-xs sm:text-sm">SOL Deposit Address</Label>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Input id="sol-deposit-address" value={depositWallet} readOnly className="text-xs sm:text-sm" />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(depositWallet, 'SOL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground pt-1">Send only native SOL to this address.</p>
                {solBalance !== null && (
                  <div className="text-xs text-success pt-1">Saldo SOL: {solBalance}</div>
                )}
              </TabsContent>
              <TabsContent value="psng" className="pt-4 space-y-2">
                <Label htmlFor="psng-deposit-address" className="text-xs sm:text-sm">PSNG Deposit Address</Label>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Input id="psng-deposit-address" value={psngDepositWallet} readOnly className="text-xs sm:text-sm" />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(psngDepositWallet, 'PSNG')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Send only PSNG tokens to this address.</p>
                {psngBalance !== null && (
                  <div className="text-xs text-success pt-1">Saldo PSNG: {psngBalance}</div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <div className="text-[10px] sm:text-xs text-center text-muted-foreground pt-4">
            Your funds will be credited after network confirmation.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs sm:text-sm py-1 sm:py-2">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
