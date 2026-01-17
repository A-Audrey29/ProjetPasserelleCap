/**
 * Database Migration Runner
 * 
 * Executes SQL migrations in order, tracking them in schema_migrations table.
 * Supports:
 * - Transactional migrations (default)
 * - Non-transactional migrations (suffix _notx) for CREATE INDEX CONCURRENTLY
 * - Idempotent execution (skips already-run migrations)
 * - Immediate exit on failure (exit code 1)
 */

import { Pool } from "@neondatabase/serverless";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

interface MigrationFile {
  name: string;
  path: string;
  noTransaction: boolean;
}

async function getMigrationFiles(): Promise<MigrationFile[]> {
  const files = await fs.readdir(MIGRATIONS_DIR);
  
  return files
    .filter(f => f.endsWith(".sql") && !f.includes("rollback") && !f.startsWith("0000"))
    .sort()
    .map(name => ({
      name,
      path: path.join(MIGRATIONS_DIR, name),
      noTransaction: name.includes("_notx"),
    }));
}

async function ensureSchemaMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      checksum VARCHAR(64) NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
}

async function getExecutedMigrations(pool: Pool): Promise<Set<string>> {
  const result = await pool.query("SELECT name FROM schema_migrations");
  return new Set(result.rows.map(r => r.name));
}

async function runMigration(
  pool: Pool,
  migration: MigrationFile,
  sql: string,
  checksum: string
): Promise<void> {
  const client = await pool.connect();
  
  try {
    if (migration.noTransaction) {
      // Execute without transaction (for CREATE INDEX CONCURRENTLY)
      console.log(`  [no-tx] Executing ${migration.name}...`);
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
        [migration.name, checksum]
      );
    } else {
      // Execute within transaction
      console.log(`  [tx] Executing ${migration.name}...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [migration.name, checksum]
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    process.exit(1);
  }
  
  console.log("=== Database Migration Runner ===");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  
  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Ensure schema_migrations table exists
    await ensureSchemaMigrationsTable(pool);
    console.log("✓ schema_migrations table ready");
    
    // Get list of migrations to run
    const migrations = await getMigrationFiles();
    const executed = await getExecutedMigrations(pool);
    
    const pending = migrations.filter(m => !executed.has(m.name));
    
    if (pending.length === 0) {
      console.log("✓ No pending migrations");
      await pool.end();
      return;
    }
    
    console.log(`Found ${pending.length} pending migration(s):`);
    pending.forEach(m => console.log(`  - ${m.name}${m.noTransaction ? " [no-tx]" : ""}`));
    console.log("");
    
    // Execute migrations in order
    for (const migration of pending) {
      try {
        const sql = await fs.readFile(migration.path, "utf-8");
        const checksum = crypto.createHash("sha256").update(sql).digest("hex");
        
        await runMigration(pool, migration, sql, checksum);
        console.log(`✓ ${migration.name} - SUCCESS`);
      } catch (err: any) {
        console.error(`✗ ${migration.name} - FAILED`);
        console.error(`  Error: ${err.message}`);
        console.error("");
        console.error("Migration aborted. Fix the issue and retry.");
        await pool.end();
        process.exit(1);
      }
    }
    
    console.log("");
    console.log(`✓ All ${pending.length} migration(s) completed successfully`);
    await pool.end();
    
  } catch (err: any) {
    console.error("Migration runner error:", err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
