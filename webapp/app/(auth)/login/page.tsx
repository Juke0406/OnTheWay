"use client";

import { TelegramAuthButton } from "@/components/auth/TelegramAuthButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to home</span>
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-none bg-transparent">
          <CardHeader>
            <CardTitle className="text-2xl text-center">On the Way</CardTitle>
            {/* <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription> */}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TelegramAuthButton
                onSuccess={() => router.push("/map")}
                onError={(error: unknown) =>
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Authentication failed"
                  )
                }
              />
            </div>

            {error && (
              <div className="mt-4 p-2 bg-destructive/10 text-destructive text-sm rounded">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4 items-center text-center">
            <p className="text-sm text-muted-foreground">
              By signing in, you agree to our <br />
              <a href="#" className="underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline">
                Privacy Policy
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
