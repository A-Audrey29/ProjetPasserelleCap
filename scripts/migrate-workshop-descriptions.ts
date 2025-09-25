#!/usr/bin/env node

/**
 * Migration robuste et production-ready pour synchroniser les descriptions d'ateliers
 * 
 * Fonctionnalités:
 * - Transaction SQL pour atomicité
 * - Import depuis le fichier source  
 * - Vérification d'existence
 * - Comparaison avant update
 * - Table migrations pour tracking
 * - Checksums pour détecter les changements
 * - Mode dry-run pour preview
 */

import { createHash } from 'crypto';
import { db } from "../server/db.ts";
import { workshopObjectives, workshops, migrations } from "../shared/schema.ts";
import { eq } from "drizzle-orm";

// Import direct depuis le fichier source pur pour éviter la duplication et les side-effects
import { objectives, workshopData } from './data/workshops-source.ts';

// Configuration
const MIGRATION_NAME = "sync-workshop-descriptions-from-source";
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');

interface MigrationResult {
  objectivesUpdated: number;
  workshopsUpdated: number;
  objectivesSkipped: number;
  workshopsSkipped: number;
  warnings: string[];
  errors: string[];
}

/**
 * Calcule le checksum du contenu source pour détecter les changements
 */
function calculateSourceChecksum(): string {
  const sourceData = {
    objectives,
    workshops: workshopData
  };
  return createHash('sha256')
    .update(JSON.stringify(sourceData, null, 0))
    .digest('hex');
}

/**
 * Vérifie si cette migration a déjà été exécutée avec le même contenu
 */
async function checkMigrationStatus(): Promise<{ exists: boolean; needsUpdate: boolean }> {
  const currentChecksum = calculateSourceChecksum();
  
  try {
    const existingMigration = await db
      .select()
      .from(migrations)
      .where(eq(migrations.name, MIGRATION_NAME))
      .limit(1);

    if (existingMigration.length === 0) {
      return { exists: false, needsUpdate: true };
    }

    const needsUpdate = existingMigration[0].checksum !== currentChecksum;
    
    if (needsUpdate) {
      console.log(`🔄 Migration détectée avec nouveau contenu`);
      console.log(`   Ancien checksum: ${existingMigration[0].checksum.substring(0, 8)}...`);
      console.log(`   Nouveau checksum: ${currentChecksum.substring(0, 8)}...`);
    } else {
      console.log(`✅ Migration déjà à jour (checksum: ${currentChecksum.substring(0, 8)}...)`);
    }

    return { exists: true, needsUpdate };
    
  } catch (error) {
    console.warn(`⚠️ Impossible de vérifier le statut de migration: ${error.message}`);
    return { exists: false, needsUpdate: true };
  }
}

/**
 * Met à jour les descriptions des objectifs avec vérification d'existence et comparaison
 */
async function updateObjectives(tx: any, result: MigrationResult): Promise<void> {
  console.log(`📝 Mise à jour des descriptions des objectifs...`);
  
  for (const objective of objectives) {
    try {
      // Vérification d'existence
      const existing = await tx
        .select()
        .from(workshopObjectives)
        .where(eq(workshopObjectives.id, objective.id))
        .limit(1);
        
      if (existing.length === 0) {
        console.warn(`⚠️ Objectif ${objective.id} n'existe pas en base, skip`);
        result.errors.push(`Objectif ${objective.id} introuvable`);
        continue;
      }

      // Comparaison avant update
      const currentName = existing[0].name;
      const newName = objective.name;
      
      if (currentName === newName) {
        console.log(`⏭️ Objectif ${objective.id}: déjà à jour`);
        result.objectivesSkipped++;
        continue;
      }

      // Update nécessaire
      if (!DRY_RUN) {
        await tx
          .update(workshopObjectives)
          .set({ name: newName })
          .where(eq(workshopObjectives.id, objective.id));
      }
      
      console.log(`${DRY_RUN ? '🔍 [DRY-RUN]' : '✅'} Objectif ${objective.id}:`);
      console.log(`   Ancien: "${currentName}"`);
      console.log(`   Nouveau: "${newName}"`);
      
      result.objectivesUpdated++;
      
    } catch (error) {
      const errorMsg = `Erreur sur objectif ${objective.id}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }
}

/**
 * Met à jour les descriptions des ateliers avec vérification d'existence et comparaison
 */
async function updateWorkshops(tx: any, result: MigrationResult): Promise<void> {
  console.log(`📝 Mise à jour des descriptions des ateliers...`);
  
  for (const workshop of workshopData) {
    try {
      // Vérification d'existence
      const existing = await tx
        .select()
        .from(workshops)
        .where(eq(workshops.id, workshop.id))
        .limit(1);
        
      if (existing.length === 0) {
        console.warn(`⚠️ Atelier ${workshop.id} n'existe pas en base, skip`);
        result.warnings.push(`Atelier ${workshop.id} introuvable - utiliser script d'initialisation pour l'ajouter`);
        result.workshopsSkipped++;
        continue;
      }

      // Comparaison avant update
      const currentDescription = existing[0].description;
      const newDescription = workshop.description;
      
      if (currentDescription === newDescription) {
        console.log(`⏭️ Atelier ${workshop.id}: déjà à jour`);
        result.workshopsSkipped++;
        continue;
      }

      // Update nécessaire
      if (!DRY_RUN) {
        await tx
          .update(workshops)
          .set({ description: newDescription })
          .where(eq(workshops.id, workshop.id));
      }
      
      console.log(`${DRY_RUN ? '🔍 [DRY-RUN]' : '✅'} Atelier ${workshop.id}:`);
      console.log(`   Ancien: "${currentDescription || 'null'}"`);
      console.log(`   Nouveau: "${newDescription}"`);
      
      result.workshopsUpdated++;
      
    } catch (error) {
      const errorMsg = `Erreur sur atelier ${workshop.id}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      result.errors.push(errorMsg);
    }
  }
}

/**
 * Enregistre l'exécution de la migration dans la table de tracking
 */
async function recordMigration(tx: any, result: MigrationResult): Promise<void> {
  if (DRY_RUN) {
    console.log(`🔍 [DRY-RUN] Migration qui serait enregistrée: ${MIGRATION_NAME}`);
    return;
  }

  const checksum = calculateSourceChecksum();
  const metadata = {
    sourceFile: 'scripts/init-workshops.ts',
    objectives: {
      total: objectives.length,
      updated: result.objectivesUpdated,
      skipped: result.objectivesSkipped
    },
    workshops: {
      total: workshopData.length,
      updated: result.workshopsUpdated,
      skipped: result.workshopsSkipped
    },
    warnings: result.warnings,
    errors: result.errors,
    dryRun: false
  };

  // Supprimer l'ancienne entrée si elle existe
  await tx
    .delete(migrations)
    .where(eq(migrations.name, MIGRATION_NAME));

  // Créer la nouvelle entrée
  await tx
    .insert(migrations)
    .values({
      name: MIGRATION_NAME,
      checksum,
      metadata
    });
    
  console.log(`📊 Migration enregistrée avec checksum: ${checksum.substring(0, 8)}...`);
}

/**
 * Fonction principale de migration
 */
async function runMigration(): Promise<void> {
  console.log(`🚀 ${DRY_RUN ? 'PREVIEW' : 'EXÉCUTION'} de la migration: ${MIGRATION_NAME}`);
  console.log(`📅 ${new Date().toISOString()}\n`);

  // Vérifier le statut de migration
  const { exists, needsUpdate } = await checkMigrationStatus();
  
  if (exists && !needsUpdate && !DRY_RUN) {
    console.log(`✅ Migration déjà à jour, aucune action nécessaire`);
    return;
  }

  if (DRY_RUN) {
    console.log(`🔍 MODE PREVIEW - Aucune modification ne sera appliquée\n`);
  }

  const result: MigrationResult = {
    objectivesUpdated: 0,
    workshopsUpdated: 0,
    objectivesSkipped: 0,
    workshopsSkipped: 0,
    warnings: [],
    errors: []
  };

  try {
    // Transaction SQL pour atomicité
    await db.transaction(async (tx) => {
      console.log(`🔒 Transaction démarrée...\n`);
      
      // Mettre à jour les objectifs
      await updateObjectives(tx, result);
      console.log(''); // Ligne vide pour la lisibilité
      
      // Mettre à jour les ateliers
      await updateWorkshops(tx, result);
      console.log(''); // Ligne vide pour la lisibilité
      
      // Enregistrer la migration
      await recordMigration(tx, result);
      
      if (result.errors.length > 0) {
        throw new Error(`Migration échouée avec ${result.errors.length} erreur(s)`);
      }
      
      console.log(`✅ Transaction validée avec succès`);
    });

  } catch (error) {
    console.error(`\n❌ ERREUR DE TRANSACTION: ${error.message}`);
    console.error(`🔄 Toutes les modifications ont été annulées (rollback)`);
    throw error;
  }

  // Résumé final
  console.log(`\n🎉 ${DRY_RUN ? 'PREVIEW' : 'MIGRATION'} TERMINÉE AVEC SUCCÈS !`);
  console.log(`📊 Résumé :`);
  console.log(`   • Objectifs mis à jour: ${result.objectivesUpdated}/${objectives.length}`);
  console.log(`   • Objectifs déjà à jour: ${result.objectivesSkipped}/${objectives.length}`);
  console.log(`   • Ateliers mis à jour: ${result.workshopsUpdated}/${workshopData.length}`);
  console.log(`   • Ateliers déjà à jour: ${result.workshopsSkipped}/${workshopData.length}`);
  
  if (result.warnings.length > 0) {
    console.log(`   • Avertissements: ${result.warnings.length}`);
    result.warnings.forEach(warning => console.log(`     - ${warning}`));
  }
  
  if (result.errors.length > 0) {
    console.log(`   • Erreurs critiques: ${result.errors.length}`);
    result.errors.forEach(error => console.log(`     - ${error}`));
  }

  if (DRY_RUN) {
    console.log(`\n💡 Pour appliquer les changements, exécutez :`);
    console.log(`   npx tsx scripts/migrate-workshop-descriptions.ts`);
  }
}

// Point d'entrée du script  
if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1]?.endsWith('migrate-workshop-descriptions.ts')) {
  runMigration()
    .then(() => {
      console.log(`\n✅ Script terminé avec succès`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`\n❌ ÉCHEC DE LA MIGRATION:`);
      console.error(error);
      console.error(`\n🔧 Vérifiez les logs ci-dessus pour plus de détails`);
      process.exit(1);
    });
}

// Export pour les tests
export { runMigration, calculateSourceChecksum };