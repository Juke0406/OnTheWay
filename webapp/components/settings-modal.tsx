"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Wallet } from "lucide-react";

// Schema for wallet top-up form
const topupFormSchema = z.object({
  amount: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Amount must be a valid number.",
    })
    .refine((val) => Number(val) > 0, {
      message: "Amount must be greater than 0.",
    }),
});

type TopupFormValues = z.infer<typeof topupFormSchema>;

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  walletBalance: number;
}

export function SettingsModal({
  open,
  onOpenChange,
  children,
  walletBalance,
}: SettingsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Default values for the form
  const defaultValues: Partial<TopupFormValues> = {
    amount: "",
  };

  const form = useForm<TopupFormValues>({
    resolver: zodResolver(topupFormSchema),
    defaultValues,
  });

  async function onSubmit(data: TopupFormValues) {
    setIsSubmitting(true);
    try {
      console.log("Submitting top-up form with amount:", data.amount);

      const response = await fetch("/api/users/wallet/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: data.amount }),
        credentials: "include", // Important for sending cookies
      });

      console.log("Top-up API response status:", response.status);
      const result = await response.json();
      console.log("Top-up API response:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to top up wallet");
      }

      toast.success(
        `Wallet topped up successfully! New balance: $${result.newBalance.toFixed(
          2
        )}`
      );
      form.reset();

      // Refresh the page to update the session data
      console.log("Refreshing page to update session data");
      router.refresh();

      // Force reload after a short delay to ensure session is updated
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error topping up wallet:", error);
      toast.error(
        `Failed to top up wallet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Credenza open={open} onOpenChange={onOpenChange}>
      <CredenzaTrigger asChild>{children}</CredenzaTrigger>
      <CredenzaContent className="sm:max-w-[500px]">
        <CredenzaHeader>
          <CredenzaTitle>Settings</CredenzaTitle>
          <CredenzaDescription>
            Manage your account settings and preferences.
          </CredenzaDescription>
        </CredenzaHeader>
        <CredenzaBody>
          <Tabs defaultValue="wallet" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Account</span>
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>Wallet</span>
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span>Appearance</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Connected Account</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is connected via Telegram
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wallet">
              <Card>
                <CardHeader>
                  <CardTitle>Wallet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Current Balance</p>
                    <p className="text-2xl font-bold">
                      ${walletBalance.toFixed(2)}
                    </p>
                  </div>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Top-up Amount ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                min="0.01"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter the amount you want to add to your wallet.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? "Processing..." : "Top Up Wallet"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">
                      System default
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CredenzaBody>
      </CredenzaContent>
    </Credenza>
  );
}
