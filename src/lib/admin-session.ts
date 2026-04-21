import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { env, requireEnv } from "./env";
import { createSupabaseServiceClient } from "./supabase";

export const ADMIN_SESSION_COOKIE = "srds_admin_session";

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET"))
    .update(payload)
    .digest("base64url");
}

export function createAdminSessionToken(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email, issuedAt: Date.now() }),
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifyAdminSessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  if (signPayload(payload) !== signature) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { email?: string; issuedAt?: number };

    if (!decoded.email) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function attachAdminSession(response: NextResponse, email: string) {
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(email),
    adminCookieOptions(),
  );
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const decoded = verifyAdminSessionToken(token);
  if (!decoded) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admins")
    .select("id,email")
    .eq("email", decoded.email)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function verifyAdminCredentials(email: string, password: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admins")
    .select("email,password_hash")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return bcrypt.compare(password, data.password_hash);
}

export function isAdminAuthConfigured() {
  return Boolean(env.adminSessionSecret);
}
