import dns from "dns";
import { PrismaClient } from "@prisma/client";

// Ensure Node resolves IPv4 first so external DBs (like Neon) don't hang on unrouted IPv6
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
