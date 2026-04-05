"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { AuthUnavailableState } from "@/components/auth/auth-unavailable-state";
import { hasClerkPublishableKey } from "@/lib/config";
import Link from "next/link";
import { Building2 } from "lucide-react";

export default function SignInPage() {
  if (!hasClerkPublishableKey) {
    return (
      <AuthUnavailableState
        title="Sign-in unavailable"
        description="The sign-in screen needs Clerk to be configured before it can be used."
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">MosqueConnect</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <SignIn.Root>
          <Clerk.Loading>
            {(isGlobalLoading) => (
              <>
                <SignIn.Step name="start">
                  <Card className="shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-xl">Sign in</CardTitle>
                      <CardDescription>
                        Choose your preferred sign in method
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Google OAuth Button */}
                      <Clerk.Connection name="google" asChild>
                        <Button
                          variant="outline"
                          className="w-full h-11"
                          disabled={isGlobalLoading}
                        >
                          <Clerk.Loading scope="provider:google">
                            {(isLoading) =>
                              isLoading ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                <>
                                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                    <path
                                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                      fill="#4285F4"
                                    />
                                    <path
                                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                      fill="#34A853"
                                    />
                                    <path
                                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                      fill="#FBBC05"
                                    />
                                    <path
                                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                      fill="#EA4335"
                                    />
                                  </svg>
                                  Continue with Google
                                </>
                              )
                            }
                          </Clerk.Loading>
                        </Button>
                      </Clerk.Connection>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                            Or continue with email
                          </span>
                        </div>
                      </div>

                      {/* Email Field */}
                      <Clerk.Field name="identifier" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>Email address</Label>
                        </Clerk.Label>
                        <Clerk.Input type="email" required asChild>
                          <Input placeholder="you@example.com" />
                        </Clerk.Input>
                        <Clerk.FieldError className="text-sm text-destructive" />
                      </Clerk.Field>

                      <Clerk.GlobalError className="text-sm text-destructive" />

                      <SignIn.Action submit asChild>
                        <Button className="w-full h-11" disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) =>
                              isLoading ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                "Continue"
                              )
                            }
                          </Clerk.Loading>
                        </Button>
                      </SignIn.Action>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                      <p className="text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link
                          href="/sign-up"
                          className="font-medium text-primary hover:underline"
                        >
                          Sign up
                        </Link>
                      </p>
                    </CardFooter>
                  </Card>
                </SignIn.Step>

                <SignIn.Step name="choose-strategy">
                  <Card className="shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-xl">Choose verification method</CardTitle>
                      <CardDescription>
                        Select how you want to verify your identity
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <SignIn.SupportedStrategy name="email_code" asChild>
                        <Button variant="outline" className="w-full h-11">
                          Email code
                        </Button>
                      </SignIn.SupportedStrategy>
                      <SignIn.SupportedStrategy name="password" asChild>
                        <Button variant="outline" className="w-full h-11">
                          Password
                        </Button>
                      </SignIn.SupportedStrategy>
                      
                      <SignIn.Action navigate="previous" asChild>
                        <Button variant="ghost" className="w-full">
                          Go back
                        </Button>
                      </SignIn.Action>
                    </CardContent>
                  </Card>
                </SignIn.Step>

                <SignIn.Step name="verifications">
                  <SignIn.Strategy name="password">
                    <Card className="shadow-lg">
                      <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Enter your password</CardTitle>
                        <CardDescription>
                          Sign in to your MosqueConnect account
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Clerk.Field name="password" className="space-y-2">
                          <Clerk.Label asChild>
                            <Label>Password</Label>
                          </Clerk.Label>
                          <Clerk.Input type="password" required asChild>
                            <Input placeholder="Enter your password" />
                          </Clerk.Input>
                          <Clerk.FieldError className="text-sm text-destructive" />
                        </Clerk.Field>

                        <Clerk.GlobalError className="text-sm text-destructive" />

                        <SignIn.Action submit asChild>
                          <Button className="w-full h-11" disabled={isGlobalLoading}>
                            <Clerk.Loading>
                              {(isLoading) =>
                                isLoading ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  "Sign in"
                                )
                              }
                            </Clerk.Loading>
                          </Button>
                        </SignIn.Action>

                        <SignIn.Action navigate="forgot-password" asChild>
                          <Button variant="link" className="w-full p-0 h-auto">
                            Forgot password?
                          </Button>
                        </SignIn.Action>
                      </CardContent>
                      <CardFooter>
                        <SignIn.Action navigate="previous" asChild>
                          <Button variant="ghost" className="w-full">
                            Use another method
                          </Button>
                        </SignIn.Action>
                      </CardFooter>
                    </Card>
                  </SignIn.Strategy>

                  <SignIn.Strategy name="email_code">
                    <Card className="shadow-lg">
                      <CardHeader className="space-y-1 pb-4">
                        <CardTitle className="text-xl">Check your email</CardTitle>
                        <CardDescription>
                          We sent a verification code to your email
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Clerk.Field name="code" className="space-y-2">
                          <Clerk.Label asChild>
                            <Label>Verification code</Label>
                          </Clerk.Label>
                          <Clerk.Input type="otp" required asChild>
                            <Input placeholder="Enter 6-digit code" className="text-center tracking-widest" />
                          </Clerk.Input>
                          <Clerk.FieldError className="text-sm text-destructive" />
                        </Clerk.Field>

                        <Clerk.GlobalError className="text-sm text-destructive" />

                        <SignIn.Action submit asChild>
                          <Button className="w-full h-11" disabled={isGlobalLoading}>
                            <Clerk.Loading>
                              {(isLoading) =>
                                isLoading ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  "Verify"
                                )
                              }
                            </Clerk.Loading>
                          </Button>
                        </SignIn.Action>

                        <SignIn.Action
                          resend
                          asChild
                          fallback={({ resendableAfter }) => (
                            <p className="text-center text-sm text-muted-foreground">
                              Resend code in {resendableAfter} seconds
                            </p>
                          )}
                        >
                          <Button variant="link" className="w-full" disabled={isGlobalLoading}>
                            Resend code
                          </Button>
                        </SignIn.Action>
                      </CardContent>
                      <CardFooter>
                        <SignIn.Action navigate="previous" asChild>
                          <Button variant="ghost" className="w-full">
                            Use another method
                          </Button>
                        </SignIn.Action>
                      </CardFooter>
                    </Card>
                  </SignIn.Strategy>
                </SignIn.Step>

                <SignIn.Step name="forgot-password">
                  <Card className="shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-xl">Reset your password</CardTitle>
                      <CardDescription>
                        We&apos;ll send you a code to reset your password
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
                        <Button className="w-full h-11" disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) =>
                              isLoading ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                "Send reset code"
                              )
                            }
                          </Clerk.Loading>
                        </Button>
                      </SignIn.SupportedStrategy>

                      <SignIn.Action navigate="previous" asChild>
                        <Button variant="ghost" className="w-full">
                          Go back
                        </Button>
                      </SignIn.Action>
                    </CardContent>
                  </Card>
                </SignIn.Step>

                <SignIn.Step name="reset-password">
                  <Card className="shadow-lg">
                    <CardHeader className="space-y-1 pb-4">
                      <CardTitle className="text-xl">Set new password</CardTitle>
                      <CardDescription>
                        Enter the code we sent and your new password
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Clerk.Field name="code" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>Reset code</Label>
                        </Clerk.Label>
                        <Clerk.Input type="otp" required asChild>
                          <Input placeholder="Enter code" className="text-center tracking-widest" />
                        </Clerk.Input>
                        <Clerk.FieldError className="text-sm text-destructive" />
                      </Clerk.Field>

                      <Clerk.Field name="password" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>New password</Label>
                        </Clerk.Label>
                        <Clerk.Input type="password" required asChild>
                          <Input placeholder="Enter new password" />
                        </Clerk.Input>
                        <Clerk.FieldError className="text-sm text-destructive" />
                      </Clerk.Field>

                      <Clerk.Field name="confirmPassword" className="space-y-2">
                        <Clerk.Label asChild>
                          <Label>Confirm password</Label>
                        </Clerk.Label>
                        <Clerk.Input type="password" required asChild>
                          <Input placeholder="Confirm new password" />
                        </Clerk.Input>
                        <Clerk.FieldError className="text-sm text-destructive" />
                      </Clerk.Field>

                      <Clerk.GlobalError className="text-sm text-destructive" />

                      <SignIn.Action submit asChild>
                        <Button className="w-full h-11" disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) =>
                              isLoading ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                "Reset password"
                              )
                            }
                          </Clerk.Loading>
                        </Button>
                      </SignIn.Action>
                    </CardContent>
                  </Card>
                </SignIn.Step>
              </>
            )}
          </Clerk.Loading>
        </SignIn.Root>
      </div>
    </div>
  );
}

