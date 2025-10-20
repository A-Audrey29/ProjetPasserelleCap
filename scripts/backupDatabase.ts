import { db } from "../server/db";
import { users, epcis, organizations } from "../shared/schema";
import fs from "fs";
import path from "path";

async function backupDatabase() {
  try {
    console.log("🔄 Démarrage du backup de la base de données...\n");
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    // Créer le dossier backups s'il n'existe pas
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Récupérer toutes les données
    const allUsers = await db.select().from(users);
    const allEpcis = await db.select().from(epcis);
    const allOrganizations = await db.select().from(organizations);
    
    // Créer l'objet de backup
    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        users: allUsers.length,
        epcis: allEpcis.length,
        organizations: allOrganizations.length,
      },
      data: {
        users: allUsers,
        epcis: allEpcis,
        organizations: allOrganizations,
      }
    };
    
    // Sauvegarder dans un fichier JSON
    const backupFilePath = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    console.log("✅ Backup réussi!");
    console.log("\n📊 Statistiques du backup:");
    console.log(`   - Users: ${allUsers.length}`);
    console.log(`   - EPCIs: ${allEpcis.length}`);
    console.log(`   - Organizations: ${allOrganizations.length}`);
    console.log(`\n💾 Fichier sauvegardé: ${backupFilePath}`);
    
    // Afficher quelques détails
    if (allUsers.length > 0) {
      console.log("\n👤 Utilisateurs sauvegardés:");
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.role}) - ${u.firstName} ${u.lastName}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors du backup:", error);
    process.exit(1);
  }
}

backupDatabase();
