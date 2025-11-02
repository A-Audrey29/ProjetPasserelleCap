// test-upload-ftps.js
// Test manuel Render -> O2Switch (FTPS)
// - vérifie la connexion (healthCheck)
// - uploade un "navette" et un "bilan" dans les bons dossiers

import fs from "fs/promises";
import os from "os";
import path from "path";

// On importe directement le fichier TypeScript via TSX
import { healthCheck, uploadNavette, uploadBilan } from "./utils/ftpsUpload.ts";

async function makeTempFile(prefix, ext = ".pdf") {
  const fpath = path.join(os.tmpdir(), `${prefix}-${Date.now()}${ext}`);
  const content = `Test FTPS (${prefix}) @ ${new Date().toISOString()}\n`; // contenu bidon
  await fs.writeFile(fpath, content);
  return fpath;
}

async function main() {
  console.log("== FTPS healthCheck ==");
  const hc = await healthCheck();
  console.log(hc);
  if (!hc.ok) {
    console.error("Health check failed, aborting.");
    process.exit(1);
  }

  // Crée deux fichiers de test
  const navetteLocal = await makeTempFile("navette");
  const bilanLocal = await makeTempFile("bilan");

  // Noms finaux côté serveur (tu peux mettre les vrais noms ensuite)
  const navetteName = `navette-test-${Date.now()}.pdf`;
  const bilanName = `bilan-test-${Date.now()}.pdf`;

  console.log("\n== Upload NAVETTE ==");
  const up1 = await uploadNavette(navetteLocal, navetteName);
  console.log(up1);

  console.log("\n== Upload BILAN ==");
  const up2 = await uploadBilan(bilanLocal, bilanName);
  console.log(up2);

  if (!up1.success || !up2.success) {
    console.error("\nAt least one upload failed.");
    process.exit(2);
  }

  console.log("\n✅ Test FTPS terminé avec succès.");
}

main().catch((e) => {
  console.error("Fatal error in test:", e);
  process.exit(3);
});
