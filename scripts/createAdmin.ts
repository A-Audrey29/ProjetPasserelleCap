import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function createAdminUser() {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@passerelle.cap"))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("L'utilisateur admin@passerelle.cap existe déjà.");
      console.log("Mise à jour du mot de passe...");
      
      // Hasher le nouveau mot de passe
      const hashedPassword = await bcrypt.hash("Admin!234", 10);
      
      // Mettre à jour l'utilisateur existant
      await db
        .update(users)
        .set({
          passwordHash: hashedPassword,
          role: "ADMIN",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, "admin@passerelle.cap"));
      
      console.log("✅ Mot de passe et rôle mis à jour avec succès pour admin@passerelle.cap");
    } else {
      console.log("Création du nouvel utilisateur admin...");
      
      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash("Admin!234", 10);
      
      // Créer le nouvel utilisateur
      await db.insert(users).values({
        email: "admin@passerelle.cap",
        passwordHash: hashedPassword,
        firstName: "Admin",
        lastName: "Passerelle CAP",
        role: "ADMIN",
        structure: "Administration",
        isActive: true,
      });
      
      console.log("✅ Utilisateur admin créé avec succès!");
    }
    
    console.log("\nDétails de connexion:");
    console.log("Email: admin@passerelle.cap");
    console.log("Mot de passe: Admin!234");
    console.log("Rôle: ADMIN");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de la création de l'utilisateur admin:", error);
    process.exit(1);
  }
}

createAdminUser();
