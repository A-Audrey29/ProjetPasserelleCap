import fetch from "node-fetch";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

// ⚙️ Important pour O2switch : fournir une implémentation de fetch
neonConfig.fetchImplementation = fetch;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be défini dans les variables d'environnement !");
}

// Nettoyer l'URL (pour éviter caractères encodés)
const cleanDatabaseUrl = process.env.DATABASE_URL
  .trim()
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

// 🔐 Connexion HTTPS via Neon
const sql = neon(cleanDatabaseUrl);

// Initialisation de Drizzle ORM
export const db = drizzle(sql, { schema });
