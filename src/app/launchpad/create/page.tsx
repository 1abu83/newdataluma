
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import { useState, useEffect, useRef } from "react";
import WalletSetupDialog from "@/components/WalletSetupDialog";
import WalletWithdrawDialog from "@/components/WalletWithdrawDialog";
import { Separator } from "@/components/ui/separator";
import Image from 'next/image';
import { UploadCloud, X } from "lucide-react";
import { app } from "@/lib/firebase";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useWallet } from "@solana/wallet-adapter-react";


const formSchema = z.object({
  projectName: z.string().min(2, "Project name must be at least 2 characters."),
  tagline: z.string().min(10, "Tagline must be at least 10 characters."),
  iconFile: z.instanceof(File).refine(file => file.size > 0, "Project icon is required.").refine(file => file.size < 2 * 1024 * 1024, "Icon size must be less than 2MB."),
  shortDescription: z.string().min(20, "Short description is too short.").max(150, "Short description is too long."),
  longDescription: z.string().min(100, "Long description is too short."),
  softCap: z.coerce.number().positive("Soft cap must be a positive number."),
  hardCap: z.coerce.number().positive("Hard cap must be a positive number."),
  presalePrice: z.coerce.number().positive("Price must be a positive number."),
  totalSupply: z.coerce.number().positive("Total supply must be a positive number."),
  tokenomicsPresale: z.coerce.number().min(1).max(100),
  tokenomicsLiquidity: z.coerce.number().min(1).max(100),
  tokenomicsTeam: z.coerce.number().min(0).max(100),
  tokenomicsMarketing: z.coerce.number().min(0).max(100),
  twitter: z.string().url().optional().or(z.literal('')),
  telegram: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
});

export default function CreateLaunchpadPage() {
    const { toast } = useToast();
    const { publicKey } = useWallet();
    const [isMarketBarOpen, setMarketBarOpen] = useState(false);
    const [isWalletSetupOpen, setWalletSetupOpen] = useState(false);
    const [isWalletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      tagline: "",
      iconFile: new File([], ""),
      shortDescription: "",
      longDescription: "",
      softCap: undefined,
      hardCap: undefined,
      presalePrice: undefined,
      totalSupply: undefined,
      tokenomicsPresale: 25,
      tokenomicsLiquidity: 20,
      tokenomicsTeam: 15,
      tokenomicsMarketing: 15,
      twitter: "",
      telegram: "",
      website: "",
    },
  });

  const handleIconChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          form.setValue("iconFile", file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setIconPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const removeIcon = () => {
    setIconPreview(null);
    form.setValue("iconFile", new File([], ""));
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!publicKey) {
        toast({
            title: "Wallet Not Connected",
            description: "Please connect your wallet to create a project.",
            variant: "destructive"
        });
        return;
    }
    setSubmitting(true);

    try {
        // 1. Upload image to Firebase Storage
        const storage = getStorage(app);
        const storageRef = ref(storage, `launchpad_icons/${Date.now()}_${values.iconFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, values.iconFile);

        const downloadURL = await new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => { /* Optional: handle progress */ },
                (error) => reject(new Error(`Image upload failed: ${error.message}`)),
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
                }
            );
        });
        
        // 2. Prepare data for Cloud Function
        const projectData = {
            ...values,
            iconUrl: downloadURL,
            creatorWallet: publicKey.toBase58(),
        };
        // @ts-ignore
        delete projectData.iconFile;

        // 3. Call the Cloud Function to save the project
        const response = await fetch("https://createlaunchpadproject-xtgnsf4tla-uc.a.run.app", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to create project");
        }

        toast({
            title: "Project Submitted Successfully!",
            description: "Your project is now under review. Redirecting to launchpad...",
        });
        form.reset();
        setIconPreview(null);
        // Optional: redirect user after success
        // window.location.href = '/launchpad';

    } catch (error: any) {
        console.error("Submission error:", error);
        toast({
            title: "Submission Failed",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
        });
    } finally {
        setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <WalletSetupDialog 
        isOpen={isWalletSetupOpen} 
        onOpenChange={setWalletSetupOpen}
      />
      <WalletWithdrawDialog
        isOpen={isWalletWithdrawOpen}
        onOpenChange={setWalletWithdrawOpen}
      />
       <Header 
        isMarketBarOpen={isMarketBarOpen} 
        onMarketToggle={() => setMarketBarOpen(!isMarketBarOpen)}
        onDepositClick={() => setWalletSetupOpen(true)}
        onWithdrawClick={() => setWalletWithdrawOpen(true)}
      />
      <main className="flex-1 container mx-auto max-w-screen-md px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">Create Your Presale</h1>
          <p className="mt-3 text-muted-foreground">
            Fill out the form below to submit your project to the LUMADEX Launchpad.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>Basic information about your project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. My Awesome Project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl>
                        <Input placeholder="A short, catchy phrase for your project." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="iconFile"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Project Icon</FormLabel>
                            <FormControl>
                                <div 
                                    className="relative flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden" 
                                        onChange={handleIconChange} 
                                        accept="image/png, image/jpeg, image/svg+xml"
                                    />
                                    {iconPreview ? (
                                        <>
                                            <Image src={iconPreview} alt="Icon preview" layout="fill" objectFit="contain" className="rounded-lg" />
                                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={(e) => { e.stopPropagation(); removeIcon(); }}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="text-center text-muted-foreground">
                                            <UploadCloud className="mx-auto h-12 w-12" />
                                            <p>Click to upload or drag and drop</p>
                                            <p className="text-xs">PNG, JPG, or SVG (max 2MB)</p>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="A brief summary of your project (max 150 characters)." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description</FormLabel>
                      <FormControl>
                        <Textarea rows={6} placeholder="Describe your project in detail. Explain its mission, technology, and value proposition." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Presale Setup</CardTitle>
                <CardDescription>Configure the parameters for your token sale.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                      control={form.control}
                      name="softCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soft Cap (SOL)</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g. 1000" {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hardCap"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hard Cap (SOL)</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g. 5000" {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <FormField
                  control={form.control}
                  name="presalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presale Price (SOL per Token)</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 0.0001" step="0.00000001" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

             <Card>
              <CardHeader>
                <CardTitle>Tokenomics</CardTitle>
                <CardDescription>Define the token distribution for your project. The total must equal 100%.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <FormField
                  control={form.control}
                  name="totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Supply</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 1000000000" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <FormField control={form.control} name="tokenomicsPresale" render={({ field }) => (<FormItem><FormLabel>Presale (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="tokenomicsLiquidity" render={({ field }) => (<FormItem><FormLabel>Liquidity (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="tokenomicsTeam" render={({ field }) => (<FormItem><FormLabel>Team (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="tokenomicsMarketing" render={({ field }) => (<FormItem><FormLabel>Marketing (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Community Links</CardTitle>
                    <CardDescription>Links to your project's website and social media channels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="twitter" render={({ field }) => (<FormItem><FormLabel>Twitter</FormLabel><FormControl><Input placeholder="https://twitter.com/yourproject" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="telegram" render={({ field }) => (<FormItem><FormLabel>Telegram</FormLabel><FormControl><Input placeholder="https://t.me/yourproject" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Project for Review"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
      <BottomBar />
    </div>
  );
}

    