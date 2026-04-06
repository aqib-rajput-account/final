"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
