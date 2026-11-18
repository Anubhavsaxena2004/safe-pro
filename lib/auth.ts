import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { sql } from "./db";
import { appSecret } from "./secret";
import type { Pro } from "./types";

type Role = "admin" | "pro";

const COOKIE: Record<Role, string> = { admin: "kd_admin", pro: "kd_pro" };
const MAX_AGE: Record<Role, number> = { admin: 60 * 60 * 24 * 7, pro: 60 * 60 * 24 * 30 };

const key = () => new TextEncoder().encode(appSecret());

export async function createSession(role: Role, id: number) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE[role])
    .sign(key());
  (await cookies()).set(COOKIE[role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE[role],
  });
}

export async function destroySession(role: Role) {
  (await cookies()).delete(COOKIE[role]);
}

async function readSession(role: Role): Promise<number | null> {
  const token = (await cookies()).get(COOKIE[role])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.role !== role) return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

// ---------- Safe Pro ----------

export const getPro = cache(async (): Promise<Pro | null> => {
  const id = await readSession("pro");
  if (!id) return null;
  const [pro] = await sql<Pro[]>`select * from pros where id = ${id}`;
  return pro ?? null;
});

export async function requirePro() {
  const pro = await getPro();
  if (!pro) redirect("/pro/login");
  return pro;
}

export async function requireApprovedPro() {
  const pro = await requirePro();
  if (pro.status !== "approved") redirect("/pro");
  return pro;
}

// ---------- Admin ----------

export interface Admin {
  id: number;
  name: string;
  email: string;
}

export const getAdmin = cache(async (): Promise<Admin | null> => {
  const id = await readSession("admin");
  if (!id) return null;
  const [admin] = await sql<Admin[]>`select id, name, email from admins where id = ${id}`;
  return admin ?? null;
});

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
