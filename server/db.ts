import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Nettoyer DATABASE_URL pour éviter les problèmes d'encodage
// Supprime les espaces initiaux/finaux et décode les entités HTML
const cleanDatabaseUrl = process.env.DATABASE_URL
  .trim()
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

export const pool = new Pool({ connectionString: cleanDatabaseUrl });
export const db = drizzle({ client: pool, schema });