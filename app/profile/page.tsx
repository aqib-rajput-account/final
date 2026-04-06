"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Header } from "@/components/layout";
import { Footer } from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { hasClerkPublishableKey } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Upload, Mail, Phone, Shield, Calendar, Send } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, userId, isSignedIn, loading: authLoading, refreshProfile, resolvedRole } = useAuth();
  const [saving, setSaving] = useState(false);
  const [bootstrappingProfile, setBootstrappingProfile] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    phone: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.push("/sign-in?redirect_url=/profile");
    }
  }, [authLoading, isSignedIn, router]);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        username: profile.username || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username || null,
          phone: formData.phone || null,
          bio: formData.bio || null,
          avatar_url: formData.avatar_url || null,
        })
        .eq("id", userId);

      if (error) {
        if (error.code === "23505") {
          toast.error("Username is already taken");
        } else {
          toast.error("Failed to update profile");
        }
        return;
      }

      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUploaded = async (imageUrl: string) => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: imageUrl })
        .eq("id", userId);

      if (error) {
        toast.error("Photo uploaded but failed to sync profile");
      } else {
        toast.success("Profile photo updated");
        setFormData((prev) => ({ ...prev, avatar_url: imageUrl }));
      }

      await refreshProfile();
    } catch {
      toast.error("Failed to sync profile photo");
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isEmailVerified = Boolean(profile?.is_verified);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  const handleBootstrapProfile = async () => {
    setBootstrappingProfile(true);
    try {
      const response = await fetch("/api/profile/bootstrap", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create profile");
      }
      await refreshProfile();
      toast.success("Profile is ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set up profile");
    } finally {
      setBootstrappingProfile(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle>Setting up your profile</CardTitle>
                <CardDescription>
                  We could not find your profile yet. Click below to create it now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleBootstrapProfile} disabled={bootstrappingProfile}>
                  {bootstrappingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    "Create My Profile"
                  )}
                </Button>
                <Button variant="outline" onClick={() => refreshProfile()} disabled={bootstrappingProfile}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h1 className="text-2xl font-bold">
                        {profile.full_name || "User"}
                      </h1>
                      <Badge variant="secondary" className="w-fit capitalize">
                        <Shield className="h-3 w-3 mr-1" />
                        {resolvedRole || profile.role}
                      </Badge>
                    </div>
                    {profile.username && (
                      <p className="text-muted-foreground">@{profile.username}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {profile.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined{" "}
                        {new Date(profile.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {hasClerkPublishableKey ? (
                      <ClerkPhotoUploader onUploaded={handlePhotoUploaded} />
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit Profile Form */}
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <CardDescription>
                  Update your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Profile Photo URL</Label>
                    <Input
                      id="avatar_url"
                      type="url"
                      value={formData.avatar_url}
                      onChange={(e) =>
                        setFormData({ ...formData, avatar_url: e.target.value })
                      }
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Your account details and verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    {!isEmailVerified && hasClerkPublishableKey && (
                      <EmailVerificationButton />
                    )}
                  </div>
                  <Badge variant={isEmailVerified ? "default" : "secondary"}>
                    {isEmailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Account Status</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is {profile.is_active ? "active" : "inactive"}
                    </p>
                  </div>
                  <Badge variant={profile.is_active ? "default" : "destructive"}>
                    {profile.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">
                      Your current role in the system
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {resolvedRole || profile.role}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EmailVerificationButton() {
  const { user } = useUser();
  const [sendingVerification, setSendingVerification] = useState(false);

  const sendEmailVerificationLink = async () => {
    if (!user?.primaryEmailAddress) {
      toast.error("No primary email found for this account");
      return;
    }

    setSendingVerification(true);
    try {
      await user.primaryEmailAddress.prepareVerification({
        strategy: "email_link",
        redirectUrl: `${window.location.origin}/profile`,
      });
      toast.success("Verification email sent. Please check your inbox.");
    } catch {
      toast.error("Unable to send verification email. Please try again.");
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <Button
      onClick={sendEmailVerificationLink}
      variant="link"
      className="h-auto p-0 mt-2 text-primary"
      disabled={sendingVerification}
    >
      {sendingVerification ? (
        <>
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Sending verification email...
        </>
      ) : (
        <>
          <Send className="mr-2 h-3.5 w-3.5" />
          Send verification link
        </>
      )}
    </Button>
  );
}

function ClerkPhotoUploader({ onUploaded }: { onUploaded: (imageUrl: string) => Promise<void> }) {
  const { user } = useUser();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload JPG, PNG, WEBP or GIF image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      const imageUrl = user.imageUrl;
      if (!imageUrl) {
        toast.error("Failed to get uploaded image URL");
        return;
      }
      await onUploaded(imageUrl);
    } catch {
      toast.error("Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <Label htmlFor="profile-photo" className="cursor-pointer inline-flex">
        <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
          {uploadingPhoto ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Change Photo
            </>
          )}
        </span>
      </Label>
      <Input
        id="profile-photo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handlePhotoUpload}
        className="hidden"
        disabled={uploadingPhoto}
      />
    </div>
  );
}
