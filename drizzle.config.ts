import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  casing: "snake_case", // Ensure migrations use snake_case column names
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
