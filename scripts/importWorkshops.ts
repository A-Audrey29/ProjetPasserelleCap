import { db } from "../server/db";
import { workshopObjectives, workshops } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

// Types pour la validation
interface ObjectiveRow {
  code: string;
  name: string;
  description: string;
  order: string;
}

interface WorkshopRow {
  id: string;
  objectiveId: string;
  name: string;
  description: string;
  minCapacity: string;
  maxCapacity: string;
}

// Fonction pour lire et parser un fichier CSV
function parseCSV<T>(filePath: string, requiredColumns: string[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), filePath);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(fullPath)) {
      reject(new Error(`❌ Fichier introuvable: ${filePath}`));
      return;
    }
    
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Vérifier que toutes les colonnes requises sont présentes
        const headers = results.meta.fields || [];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          reject(new Error(`❌ Colonnes manquantes dans ${filePath}: ${missingColumns.join(', ')}`));
          return;
        }
        
        if (results.errors.length > 0) {
          reject(new Error(`❌ Erreurs de parsing dans ${filePath}: ${JSON.stringify(results.errors)}`));
          return;
        }
        
        console.log(`✅ Fichier ${filePath} parsé avec succès: ${results.data.length} lignes`);
        resolve(results.data);
      },
      error: (error) => {
        reject(new Error(`❌ Erreur lors du parsing de ${filePath}: ${error.message}`));
      }
    });
  });
}

// Fonction principale d'import
async function importWorkshops() {
  console.log("🚀 Démarrage de l'import des ateliers et objectifs\n");
  
  try {
    // ========== ÉTAPE 1: Lecture et validation des CSV ==========
    console.log("📖 ÉTAPE 1: Lecture des fichiers CSV...");
    
    const objectivesData = await parseCSV<ObjectiveRow>(
      'data/workshop_objectives.csv',
      ['code', 'name', 'description', 'order']
    );
    
    const workshopsData = await parseCSV<WorkshopRow>(
      'data/workshops.csv',
      ['id', 'objectiveId', 'name', 'description', 'minCapacity', 'maxCapacity']
    );
    
    console.log(`   📊 ${objectivesData.length} objectifs à importer`);
    console.log(`   📊 ${workshopsData.length} ateliers à importer\n`);
    
    // ========== ÉTAPE 2: Validation des données ==========
    console.log("🔍 ÉTAPE 2: Validation de l'intégrité des données...");
    
    // Vérifier que tous les objectifs ont un code unique
    const objectiveCodes = objectivesData.map(obj => obj.code);
    const duplicateObjectives = objectiveCodes.filter((code, index) => objectiveCodes.indexOf(code) !== index);
    if (duplicateObjectives.length > 0) {
      throw new Error(`❌ Codes d'objectifs en double: ${duplicateObjectives.join(', ')}`);
    }
    console.log(`   ✅ Aucun doublon dans les codes d'objectifs`);
    
    // Vérifier que tous les ateliers ont un ID unique
    const workshopIds = workshopsData.map(w => w.id);
    const duplicateWorkshops = workshopIds.filter((id, index) => workshopIds.indexOf(id) !== index);
    if (duplicateWorkshops.length > 0) {
      throw new Error(`❌ IDs d'ateliers en double: ${duplicateWorkshops.join(', ')}`);
    }
    console.log(`   ✅ Aucun doublon dans les IDs d'ateliers`);
    
    // Vérifier que tous les objectiveId des ateliers référencent un objectif existant
    const invalidReferences = workshopsData.filter(w => !objectiveCodes.includes(w.objectiveId));
    if (invalidReferences.length > 0) {
      throw new Error(`❌ Ateliers avec objectiveId invalide: ${invalidReferences.map(w => `${w.id} -> ${w.objectiveId}`).join(', ')}`);
    }
    console.log(`   ✅ Toutes les références objectiveId sont valides\n`);
    
    // ========== ÉTAPE 3: Import des objectifs ==========
    console.log("💾 ÉTAPE 3: Import des objectifs dans la base de données...");
    
    let objectivesImported = 0;
    let objectivesUpdated = 0;
    
    for (const obj of objectivesData) {
      // Vérifier si l'objectif existe déjà
      const existing = await db
        .select()
        .from(workshopObjectives)
        .where(eq(workshopObjectives.code, obj.code))
        .limit(1);
      
      if (existing.length > 0) {
        // Mise à jour
        await db
          .update(workshopObjectives)
          .set({
            name: obj.name,
            description: obj.description || null,
            order: parseInt(obj.order, 10),
          })
          .where(eq(workshopObjectives.code, obj.code));
        
        objectivesUpdated++;
        console.log(`   🔄 Objectif mis à jour: ${obj.code} - ${obj.name}`);
      } else {
        // Insertion
        await db.insert(workshopObjectives).values({
          code: obj.code,
          name: obj.name,
          description: obj.description || null,
          order: parseInt(obj.order, 10),
        });
        
        objectivesImported++;
        console.log(`   ✅ Objectif créé: ${obj.code} - ${obj.name}`);
      }
    }
    
    console.log(`\n   📊 Résumé objectifs: ${objectivesImported} créés, ${objectivesUpdated} mis à jour\n`);
    
    // ========== ÉTAPE 4: Import des ateliers ==========
    console.log("💾 ÉTAPE 4: Import des ateliers dans la base de données...");
    
    let workshopsImported = 0;
    let workshopsUpdated = 0;
    
    for (const workshop of workshopsData) {
      // Vérifier si l'atelier existe déjà
      const existing = await db
        .select()
        .from(workshops)
        .where(eq(workshops.id, workshop.id))
        .limit(1);
      
      // Parser les capacités (peuvent être vides)
      const minCapacity = workshop.minCapacity ? parseInt(workshop.minCapacity, 10) : null;
      const maxCapacity = workshop.maxCapacity ? parseInt(workshop.maxCapacity, 10) : null;
      
      if (existing.length > 0) {
        // Mise à jour
        await db
          .update(workshops)
          .set({
            objectiveId: workshop.objectiveId,
            name: workshop.name,
            description: workshop.description || null,
            minCapacity,
            maxCapacity,
          })
          .where(eq(workshops.id, workshop.id));
        
        workshopsUpdated++;
        console.log(`   🔄 Atelier mis à jour: ${workshop.id} - ${workshop.name}`);
      } else {
        // Insertion
        await db.insert(workshops).values({
          id: workshop.id,
          objectiveId: workshop.objectiveId,
          name: workshop.name,
          description: workshop.description || null,
          minCapacity,
          maxCapacity,
        });
        
        workshopsImported++;
        console.log(`   ✅ Atelier créé: ${workshop.id} - ${workshop.name}`);
      }
    }
    
    console.log(`\n   📊 Résumé ateliers: ${workshopsImported} créés, ${workshopsUpdated} mis à jour\n`);
    
    // ========== ÉTAPE 5: Vérification finale ==========
    console.log("🔍 ÉTAPE 5: Vérification finale...");
    
    const totalObjectives = await db.select().from(workshopObjectives);
    const totalWorkshops = await db.select().from(workshops);
    
    console.log(`   ✅ Total objectifs dans la base: ${totalObjectives.length}`);
    console.log(`   ✅ Total ateliers dans la base: ${totalWorkshops.length}`);
    
    // Vérifier la répartition par objectif
    console.log("\n   📊 Répartition des ateliers par objectif:");
    for (const obj of totalObjectives) {
      const count = totalWorkshops.filter(w => w.objectiveId === obj.code).length;
      console.log(`      - ${obj.code} (${obj.name}): ${count} ateliers`);
    }
    
    console.log("\n🎉 Import terminé avec succès!\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERREUR CRITIQUE lors de l'import:");
    console.error(error);
    process.exit(1);
  }
}

// Exécution
importWorkshops();
