"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldX, Building2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getRoleDisplayName } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const { profile, isSignedIn } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <Building2 className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to view this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          {isSignedIn && profile && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                You are signed in as
              </p>
              <p className="font-medium">{profile.email}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your role: <span className="font-semibold text-foreground">{getRoleDisplayName(profile.role)}</span>
              </p>
            </div>
          )}
          
          <p className="text-muted-foreground">
            The page you&apos;re trying to access requires special permissions.
            If you believe you should have access, please contact your mosque
            administrator.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Role-based access:</strong> Different sections of
              MosqueConnect are available based on your role (Super Admin, Admin, Shura,
              Imam, or Member).
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button asChild className="flex-1">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

