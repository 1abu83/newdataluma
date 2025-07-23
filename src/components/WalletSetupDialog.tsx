
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
import { getAuth, signInWithCustomToken, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, onSnapshot, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";


const LOGIN_OR_SIGNUP_URL = "https://loginorsignup-xtgnsf4tla-uc.a.run.app";

interface WalletSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletSetupDialog({ isOpen, onOpenChange }: WalletSetupDialogProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [depositWallet, setDepositWallet] = useState<string>("");
  const [psngDepositWallet, setPsngDepositWallet] = useState<string>(""); // Should be different in prod
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [psngBalance, setPsngBalance] = useState<number | null>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      if (user) {
         fetchBalances(user.uid);
      } else {
        setSolBalance(null);
        setPsngBalance(null);
        setDepositWallet("");
        setPsngDepositWallet("");
      }
    });
    return () => unsubscribe();
  }, [auth]);

  async function fetchBalances(userId: string) {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setDepositWallet(userData.depositWallet || "N/A");
        setPsngDepositWallet(userData.depositWallet || "N/A"); // Demo: using same wallet
      }

      const solBalanceRef = doc(db, "users", userId, "balances", "SOL");
      const psngBalanceRef = doc(db, "users", userId, "balances", "PSNG");

      onSnapshot(solBalanceRef, (doc) => {
        setSolBalance(doc.exists() ? doc.data().amount : 0);
      });
      onSnapshot(psngBalanceRef, (doc) => {
        setPsngBalance(doc.exists() ? doc.data().amount : 0);
      });
    } catch (e) {
      console.error("Error fetching balances:", e);
      setSolBalance(null);
      setPsngBalance(null);
    }
  }


  const handleCopyAddress = (address: string, token: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: `${token} Address Copied!`,
      description: `The ${token} deposit address has been copied to your clipboard.`,
    });
  };

  const handleLoginWithWallet = async () => {
    if (!publicKey) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(LOGIN_OR_SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to login/signup");

      await signInWithCustomToken(auth, data.customToken);
      
      setDepositWallet(data.user.depositWallet || "");
      setPsngDepositWallet(data.user.depositWallet || "");
      toast({ title: "Login Success", description: "Wallet authenticated and deposit address loaded." });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Login Failed", description: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
            <Button onClick={handleLoginWithWallet} disabled={loading || !connected} className="w-full mb-4">
              {loading ? "Authenticating..." : "Login/Register with Wallet"}
            </Button>
          ) : (
            <Tabs defaultValue="sol" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sol">SOL</TabsTrigger>
                <TabsTrigger value="psng">PSNG</TabsTrigger>
              </TabsList>
              <TabsContent value="sol" className="pt-4 space-y-2">
                <Label htmlFor="sol-deposit-address">SOL Deposit Address</Label>
                <div className="flex items-center gap-2">
                  <Input id="sol-deposit-address" value={depositWallet} readOnly />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(depositWallet, 'SOL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Send only native SOL to this address.</p>
                {solBalance !== null && (
                  <div className="text-xs text-success pt-1 font-semibold">Your Balance: {solBalance.toFixed(4)} SOL</div>
                )}
              </TabsContent>
              <TabsContent value="psng" className="pt-4 space-y-2">
                <Label htmlFor="psng-deposit-address">PSNG Deposit Address</Label>
                <div className="flex items-center gap-2">
                  <Input id="psng-deposit-address" value={psngDepositWallet} readOnly />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(psngDepositWallet, 'PSNG')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Send only PSNG tokens to this address.</p>
                {psngBalance !== null && (
                  <div className="text-xs text-success pt-1 font-semibold">Your Balance: {psngBalance.toFixed(4)} PSNG</div>
                )}
              </TabsContent>
            </Tabs>
          )}
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
