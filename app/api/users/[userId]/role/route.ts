import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Role hierarchy for permission checking
const ROLE_HIERARCHY = ["member", "imam", "shura", "admin", "super_admin"] as const;
type UserRole = (typeof ROLE_HIERARCHY)[number];

function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  // Only super_admin can manage other super_admins
  if (targetRole === "super_admin") {
    return managerRole === "super_admin";
  }
  
  // Super admin can manage anyone
  if (managerRole === "super_admin") return true;
  
  // Admin can manage users with lower roles
  if (managerRole === "admin") {
    return getRoleLevel(targetRole) < getRoleLevel("admin");
  }
  
  return false;
}

// Create a Supabase client with the service role key for admin operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await context.params;
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { role: newRole } = body;

    if (!newRole || !ROLE_HIERARCHY.includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get the current user's profile to check their role
    const supabase = getSupabaseAdmin();
    
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (currentUserError || !currentUserProfile) {
      return NextResponse.json({ error: "Failed to verify permissions" }, { status: 403 });
    }

    const currentUserRole = currentUserProfile.role as UserRole;

    // Check if the current user has permission to change roles
    if (currentUserRole !== "super_admin" && currentUserRole !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Get the target user's current role
    const { data: targetUserProfile, error: targetUserError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .single();

    if (targetUserError || !targetUserProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserRole = targetUserProfile.role as UserRole;

    // Check if the current user can manage the target user
    if (!canManageUser(currentUserRole, targetUserRole)) {
      return NextResponse.json({ error: "Cannot manage this user" }, { status: 403 });
    }

    // Check if the current user can assign the new role
    if (newRole === "super_admin" && currentUserRole !== "super_admin") {
      return NextResponse.json({ error: "Only super admins can assign super admin role" }, { status: 403 });
    }

    // Prevent users from changing their own role
    if (userId === targetUserId) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
    }

    // Update the user's role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `User role updated to ${newRole}` 
    });
  } catch (error) {
    console.error("Error in role update API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
