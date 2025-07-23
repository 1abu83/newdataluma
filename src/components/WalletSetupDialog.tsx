
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
import { Copy, RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import { getAuth, signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth"
import { getFirestore, doc, onSnapshot, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils"

const ENDPOINTS = {
  loginOrSignup: "https://loginorsignup-xtgnsf4tla-uc.a.run.app",
  detectBalance: "https://detectbalance-xtgnsf4tla-uc.a.run.app",
};

// Placeholder untuk PSNG mint address di devnet. Ganti jika perlu.
const PSNG_MINT_ADDRESS = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"; 

interface WalletSetupDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WalletSetupDialog({ isOpen, onOpenChange }: WalletSetupDialogProps) {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState<'sol' | 'psng' | null>(null);
  
  const [depositWallet, setDepositWallet] = useState<string>("");
  
  // Saldo dari listener realtime
  const [solBalance, setSolBalance] = useState<number | undefined>(undefined);
  const [psngBalance, setPsngBalance] = useState<number | undefined>(undefined);


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Ambil data user dari firestore setelah login
        const db = getFirestore();
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setDepositWallet(userDoc.data().depositWallet || "");
        }
      } else {
        // Reset state saat logout
        setDepositWallet("");
        setSolBalance(undefined);
        setPsngBalance(undefined);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listener saldo realtime
  useEffect(() => {
    if (user && publicKey) {
      const db = getFirestore();
      const userId = publicKey.toBase58();
      
      const solUnsub = onSnapshot(doc(db, "users", userId, "balances", "SOL"), (doc) => {
        setSolBalance(doc.exists() ? doc.data().amount : 0);
      });
      const psngUnsub = onSnapshot(doc(db, "users", userId, "balances", "PSNG"), (doc) => {
        setPsngBalance(doc.exists() ? doc.data().amount : 0);
      });

      return () => {
        solUnsub();
        psngUnsub();
      };
    }
  }, [user, publicKey]);


  const handleCopyAddress = (address: string, token: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: `${token} Address Copied!`,
      description: `The ${token} deposit address has been copied to your clipboard.`,
    });
  };

  const handleLoginWithWallet = async () => {
    if (!publicKey) {
      toast({ variant: "destructive", title: "Wallet not connected", description: "Please connect your wallet first." });
      return;
    }
    setLoading(true);
    try {
      const loginRes = await fetch(ENDPOINTS.loginOrSignup, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error || "Failed to login/signup");

      const auth = getAuth();
      await signInWithCustomToken(auth, loginData.customToken);
      
      // Data user akan di-fetch oleh onAuthStateChanged
      toast({ title: "Login Success", description: "Wallet authenticated successfully." });

    } catch (e: any) {
      toast({ variant: "destructive", title: "Login Failed", description: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async (tokenType: 'SOL' | 'PSNG') => {
    if (!publicKey || !depositWallet) {
        toast({ variant: "destructive", title: "Error", description: "User or deposit wallet not found." });
        return;
    }
    setRefreshing(tokenType.toLowerCase() as 'sol' | 'psng');
    try {
        const body: { userId: string, address: string, tokenType: string, tokenMint?: string } = {
            userId: publicKey.toBase58(),
            address: depositWallet,
            tokenType: tokenType,
        };

        if (tokenType === 'PSNG') {
            body.tokenMint = PSNG_MINT_ADDRESS;
        }

        const response = await fetch(ENDPOINTS.detectBalance, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || "Failed to refresh balance.");
        }

        toast({ title: `${tokenType} Balance Refresh`, description: "Your balance is being updated." });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Refresh Failed", description: e.message || String(e) });
    } finally {
        setRefreshing(null);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            {user ? (
              <>Select the token you wish to deposit. Send funds only to the corresponding address.</>
            ) : (
              <>You must login with your wallet to get your deposit address.</>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          {!user ? (
            <Button onClick={handleLoginWithWallet} disabled={loading || !publicKey} className="w-full mb-4">
              {loading ? "Authenticating..." : "Login with Wallet"}
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
                {solBalance !== undefined && (
                  <div className="flex items-center text-xs text-primary pt-1 font-semibold">
                    <span>Balance: {solBalance.toFixed(4)} SOL</span>
                     <Button variant="ghost" size="icon" className="h-5 w-5 ml-2" onClick={() => handleRefreshBalance('SOL')} disabled={refreshing === 'sol'}>
                        <RefreshCw className={cn("h-3 w-3", refreshing === 'sol' && "animate-spin")} />
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="psng" className="pt-4 space-y-2">
                <Label htmlFor="psng-deposit-address">PSNG Deposit Address</Label>
                 <div className="flex items-center gap-2">
                  <Input id="psng-deposit-address" value={depositWallet} readOnly />
                  <Button variant="outline" size="icon" onClick={() => handleCopyAddress(depositWallet, 'PSNG')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Send only PSNG tokens to this address.</p>
                 {psngBalance !== undefined && (
                  <div className="flex items-center text-xs text-primary pt-1 font-semibold">
                    <span>Balance: {psngBalance.toFixed(4)} PSNG</span>
                     <Button variant="ghost" size="icon" className="h-5 w-5 ml-2" onClick={() => handleRefreshBalance('PSNG')} disabled={refreshing === 'psng'}>
                        <RefreshCw className={cn("h-3 w-3", refreshing === 'psng' && "animate-spin")} />
                    </Button>
                  </div>
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
