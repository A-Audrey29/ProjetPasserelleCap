import { db } from "../server/db.ts";
import { workshopObjectives, workshops } from "../shared/schema.ts";
import { objectives, workshopData } from "./data/workshops-source.ts";

async function main() {
  await db.delete(workshops);
  await db.delete(workshopObjectives);
  await db.insert(workshopObjectives).values(objectives);
  await db.insert(workshops).values(workshopData);
  console.log(`Seeded ${objectives.length} objectives and ${workshopData.length} workshops`);
}

// Only execute if this script is run directly, not when imported
if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1]?.endsWith('init-workshops.ts')) {
  main().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}