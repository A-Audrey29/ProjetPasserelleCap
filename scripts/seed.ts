import fs from 'fs';
import path from 'path';
import { db } from '../server/db.ts';
import { epcis, organizations } from '../shared/schema.ts';

type CsvRow = { [key: string]: string };

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\n') {
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
      } else if (char === '\r') {
        // ignore
      } else {
        current += char;
      }
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function loadOrganizations(csvPath: string) {
  const csv = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csv);
  const header = rows[0];
  const data = rows.slice(1).map(r => {
    const obj: CsvRow = {};
    header.forEach((h, i) => (obj[h] = r[i] ?? ''));
    return obj;
  }).filter(o => o['Nom'] && o['EPCI']);
  return data;
}

async function main() {
  const csvPath = path.resolve(__dirname, 'data/organizations.csv');
  const organizationsCsv = loadOrganizations(csvPath);
  const epciNames = Array.from(new Set(organizationsCsv.map(o => o['EPCI'])));
  await db.delete(organizations);
  await db.delete(epcis);
  const epcisInserted = await db.insert(epcis).values(epciNames.map(name => ({ name }))).returning();
  const epciMap = new Map(epcisInserted.map(e => [e.name, e.id]));
  await db.insert(organizations).values(
    organizationsCsv.map(o => ({
      name: o['Nom'],
      contactName: o['Nom prénom de la Directrice'] || null,
      contactEmail: o['Contacts'] || null,
      contact: [o['Adresse'], o['Ville']].filter(Boolean).join(', ') || null,
      epci: o['EPCI'],
      epciId: epciMap.get(o['EPCI'])!,
    }))
  );
  console.log(`Seeded ${epcisInserted.length} EPCIs and ${organizationsCsv.length} organizations`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
