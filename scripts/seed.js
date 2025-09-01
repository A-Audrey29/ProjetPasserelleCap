import bcrypt from 'bcryptjs';
import { db } from '../server/db.ts';
import { 
  users, epsi, organizations, families, children, workshopObjectives, 
  workshops, ficheNavettes, ficheWorkshopSelections, auditLogs, comments
} from '../shared/schema.ts';

const SALT_ROUNDS = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clean existing data
    console.log('🗑️  Cleaning existing data...');
    await db.delete(comments);
    await db.delete(auditLogs);
    await db.delete(ficheWorkshopSelections);
    await db.delete(ficheNavettes);
    await db.delete(workshops);
    await db.delete(workshopObjectives);
    await db.delete(children);
    await db.delete(families);
    await db.delete(users);
    await db.delete(organizations);
    await db.delete(epsi);

    // Seed EPSI
    console.log('🏢 Creating EPSI...');
    const epsiData = await db.insert(epsi).values([
      { name: 'EPSI Nord' },
      { name: 'EPSI Sud' },
      { name: 'EPSI Est' },
      { name: 'EPSI Ouest' },
      { name: 'EPSI Centre' },
      { name: 'EPSI Métropole' }
    ]).returning();

    // Seed Organizations
    console.log('🏛️  Creating Organizations...');
    const orgsData = await db.insert(organizations).values([
      {
        name: 'Association Entraide',
        type: 'EVS',
        address: '15 rue des Fleurs, 75001 Paris',
        contact: 'Marie Dupuis',
        email: 'contact@entraide.fr',
        phone: '01 23 45 67 89',
        epsiId: epsiData[0].id
      },
      {
        name: 'Centre Social Horizon',
        type: 'CS',
        address: '42 avenue de la République, 75011 Paris',
        contact: 'Jean Martin',
        email: 'horizon@cs.fr',
        phone: '01 34 56 78 90',
        epsiId: epsiData[0].id
      },
      {
        name: 'EVS Solidarité',
        type: 'EVS',
        address: '8 place de la Mairie, 69001 Lyon',
        contact: 'Sophie Rousseau',
        email: 'solidarite@evs.fr',
        phone: '04 12 34 56 78',
        epsiId: epsiData[1].id
      },
      {
        name: 'Maison des Familles',
        type: 'CS',
        address: '25 rue Victor Hugo, 13001 Marseille',
        contact: 'Pierre Blanc',
        email: 'familles@cs-marseille.fr',
        phone: '04 91 23 45 67',
        epsiId: epsiData[1].id
      },
      {
        name: 'Centre Social Espoir',
        type: 'CS',
        address: '12 boulevard Clemenceau, 67000 Strasbourg',
        contact: 'Annie Weber',
        email: 'espoir@cs-alsace.fr',
        phone: '03 88 12 34 56',
        epsiId: epsiData[2].id
      },
      {
        name: 'EVS Les Liens',
        type: 'EVS',
        address: '7 rue de la Paix, 35000 Rennes',
        contact: 'Luc Moreau',
        email: 'liens@evs-bretagne.fr',
        phone: '02 99 87 65 43',
        epsiId: epsiData[3].id
      }
    ]).returning();

    // Seed Workshop Objectives
    console.log('🎯 Creating Workshop Objectives...');
    const objectivesData = await db.insert(workshopObjectives).values([
      {
        code: 'OBJ1',
        name: 'Compétences parentales',
        order: 1
      },
      {
        code: 'OBJ2',
        name: 'Communication intergénérationnelle',
        order: 2
      },
      {
        code: 'OBJ3',
        name: 'Dynamiques par le sport',
        order: 3
      }
    ]).returning();

    // Seed Workshops
    console.log('🔧 Creating Workshops...');
    await db.insert(workshops).values([
      // OBJ1 - Compétences parentales
      {
        objectiveId: objectivesData[0].id,
        name: 'Atelier communication parent-enfant',
        description: '4 séances de 2h pour améliorer la communication',
        priceCents: 32000, // €320
        orgId: orgsData[0].id
      },
      {
        objectiveId: objectivesData[0].id,
        name: 'Gestion des émotions',
        description: '6 séances individuelles d\'accompagnement',
        priceCents: 48000, // €480
        orgId: orgsData[1].id
      },
      {
        objectiveId: objectivesData[0].id,
        name: 'Techniques éducatives positives',
        description: '5 séances collectives sur les méthodes éducatives',
        priceCents: 40000, // €400
        orgId: orgsData[2].id
      },
      // OBJ2 - Communication intergénérationnelle
      {
        objectiveId: objectivesData[1].id,
        name: 'Ateliers famille',
        description: '8 séances collectives parents-enfants',
        priceCents: 64000, // €640
        orgId: orgsData[0].id
      },
      {
        objectiveId: objectivesData[1].id,
        name: 'Médiation familiale',
        description: 'Accompagnement personnalisé en cas de conflit',
        priceCents: 28000, // €280
        orgId: orgsData[1].id
      },
      {
        objectiveId: objectivesData[1].id,
        name: 'Dialogue intergénérationnel',
        description: '6 séances de rencontres grands-parents/petits-enfants',
        priceCents: 36000, // €360
        orgId: orgsData[3].id
      },
      // OBJ3 - Dynamiques par le sport
      {
        objectiveId: objectivesData[2].id,
        name: 'Sport collectif famille',
        description: 'Activités sportives parents-enfants',
        priceCents: 20000, // €200
        orgId: orgsData[0].id
      },
      {
        objectiveId: objectivesData[2].id,
        name: 'Randonnée familiale',
        description: '4 sorties découverte en famille',
        priceCents: 15000, // €150
        orgId: orgsData[2].id
      },
      {
        objectiveId: objectivesData[2].id,
        name: 'Jeux coopératifs',
        description: 'Ateliers de jeux collectifs et coopératifs',
        priceCents: 18000, // €180
        orgId: orgsData[4].id
      }
    ]);

    // Seed Demo Users
    console.log('👥 Creating demo users...');
    const usersData = await db.insert(users).values([
      {
        email: 'admin@passerelle.cap',
        passwordHash: await hashPassword('Admin!234'),
        firstName: 'Admin',
        lastName: 'Système',
        role: 'ADMIN'
      },
      {
        email: 'emetteur@tas.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Marie',
        lastName: 'Dupont',
        role: 'EMETTEUR',
        epsiId: epsiData[0].id
      },
      {
        email: 'relations@feves.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Jean',
        lastName: 'Martin',
        role: 'RELATIONS_EVS',
        epsiId: epsiData[0].id
      },
      {
        email: 'evs@association.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Sophie',
        lastName: 'Rousseau',
        role: 'EVS_CS',
        orgId: orgsData[0].id,
        epsiId: epsiData[0].id
      },
      {
        email: 'suivi@feves.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Pierre',
        lastName: 'Blanc',
        role: 'SUIVI_PROJETS',
        epsiId: epsiData[0].id
      },
      {
        email: 'evs2@horizon.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Annie',
        lastName: 'Weber',
        role: 'EVS_CS',
        orgId: orgsData[1].id,
        epsiId: epsiData[0].id
      }
    ]).returning();

    // Seed Families
    console.log('👨‍👩‍👧‍👦 Creating families...');
    const familiesData = await db.insert(families).values([
      {
        code: 'FAM-456',
        address: '12 rue de la Liberté, 75012 Paris',
        phone: '01 42 34 56 78',
        email: 'famille.martin@email.fr',
        mother: 'Catherine Martin',
        father: 'Philippe Martin',
        notes: 'Famille monoparentale avec deux enfants en difficulté scolaire'
      },
      {
        code: 'FAM-789',
        address: '8 avenue des Roses, 69003 Lyon',
        phone: '04 78 12 34 56',
        email: 'dubois.famille@gmail.com',
        mother: 'Sarah Dubois',
        father: null,
        guardian: 'Grand-mère: Jeanne Dubois',
        notes: 'Mère seule avec trois enfants, besoin d\'accompagnement parental'
      },
      {
        code: 'FAM-123',
        address: '25 place du Marché, 13005 Marseille',
        phone: '04 91 65 43 21',
        email: 'garcia.family@outlook.fr',
        mother: 'Maria Garcia',
        father: 'Carlos Garcia',
        notes: 'Famille d\'origine étrangère, difficultés d\'intégration'
      }
    ]).returning();

    // Seed Children
    console.log('👶 Creating children...');
    await db.insert(children).values([
      // Famille Martin
      {
        familyId: familiesData[0].id,
        firstName: 'Lucas',
        birthDate: new Date('2015-03-15'),
        level: 'CE2'
      },
      {
        familyId: familiesData[0].id,
        firstName: 'Emma',
        birthDate: new Date('2017-09-20'),
        level: 'CP'
      },
      // Famille Dubois
      {
        familyId: familiesData[1].id,
        firstName: 'Thomas',
        birthDate: new Date('2014-01-10'),
        level: 'CM1'
      },
      {
        familyId: familiesData[1].id,
        firstName: 'Léa',
        birthDate: new Date('2016-06-05'),
        level: 'CE1'
      },
      {
        familyId: familiesData[1].id,
        firstName: 'Noah',
        birthDate: new Date('2018-11-12'),
        level: 'Maternelle'
      },
      // Famille Garcia
      {
        familyId: familiesData[2].id,
        firstName: 'Sofia',
        birthDate: new Date('2013-08-25'),
        level: '6ème'
      },
      {
        familyId: familiesData[2].id,
        firstName: 'Diego',
        birthDate: new Date('2015-12-03'),
        level: 'CE2'
      }
    ]);

    // Seed Demo Fiches
    console.log('📋 Creating demo fiches...');
    const fichesData = await db.insert(ficheNavettes).values([
      {
        ref: 'FN-2024-001',
        state: 'SUBMITTED_TO_FEVES',
        emitterId: usersData[1].id, // Marie Dupont (EMETTEUR)
        familyId: familiesData[0].id,
        epsiId: epsiData[0].id,
        description: 'Famille monoparentale avec deux enfants en difficulté scolaire. Besoin d\'accompagnement pour améliorer la communication et établir des routines éducatives.',
        createdAt: new Date('2024-01-15T09:30:00Z'),
        updatedAt: new Date('2024-01-15T14:20:00Z')
      },
      {
        ref: 'FN-2024-002',
        state: 'EVS_ACCEPTED',
        emitterId: usersData[1].id,
        familyId: familiesData[1].id,
        assignedOrgId: orgsData[1].id,
        epsiId: epsiData[0].id,
        description: 'Mère seule avec trois enfants, demande d\'accompagnement pour gestion du stress parental et activités en famille.',
        createdAt: new Date('2024-01-12T10:15:00Z'),
        updatedAt: new Date('2024-01-18T16:30:00Z')
      },
      {
        ref: 'FN-2024-003',
        state: 'CLOSED',
        emitterId: usersData[1].id,
        familyId: familiesData[2].id,
        assignedOrgId: orgsData[2].id,
        epsiId: epsiData[1].id,
        description: 'Famille d\'origine étrangère, besoin d\'accompagnement pour l\'intégration et la communication intergénérationnelle.',
        createdAt: new Date('2024-01-08T08:45:00Z'),
        updatedAt: new Date('2024-01-25T17:00:00Z')
      }
    ]).returning();

    // Seed Workshop Selections for demo fiches
    console.log('🎨 Creating workshop selections...');
    const workshopsData = await db.select().from(workshops);
    
    // Fiche 1 selections
    await db.insert(ficheWorkshopSelections).values([
      {
        ficheId: fichesData[0].id,
        workshopId: workshopsData[0].id, // Atelier communication parent-enfant
        qty: 1
      },
      {
        ficheId: fichesData[0].id,
        workshopId: workshopsData[3].id, // Ateliers famille
        qty: 1
      }
    ]);

    // Fiche 2 selections
    await db.insert(ficheWorkshopSelections).values([
      {
        ficheId: fichesData[1].id,
        workshopId: workshopsData[1].id, // Gestion des émotions
        qty: 1
      },
      {
        ficheId: fichesData[1].id,
        workshopId: workshopsData[6].id, // Sport collectif famille
        qty: 1
      }
    ]);

    // Fiche 3 selections
    await db.insert(ficheWorkshopSelections).values([
      {
        ficheId: fichesData[2].id,
        workshopId: workshopsData[4].id, // Médiation familiale
        qty: 1
      },
      {
        ficheId: fichesData[2].id,
        workshopId: workshopsData[5].id, // Dialogue intergénérationnel
        qty: 1
      }
    ]);

    // Seed Demo Comments
    console.log('💬 Creating demo comments...');
    await db.insert(comments).values([
      {
        ficheId: fichesData[0].id,
        authorId: usersData[1].id,
        content: 'Famille très motivée, situation stable. Priorité sur les ateliers de communication.'
      },
      {
        ficheId: fichesData[1].id,
        authorId: usersData[2].id,
        content: 'Affectation à Centre Social Horizon confirmée. Première rencontre programmée.'
      },
      {
        ficheId: fichesData[2].id,
        authorId: usersData[3].id,
        content: 'Activités terminées avec succès. Famille très satisfaite des résultats.'
      }
    ]);

    // Seed Audit Logs
    console.log('📜 Creating audit logs...');
    await db.insert(auditLogs).values([
      {
        actorId: usersData[1].id,
        action: 'create',
        entity: 'FicheNavette',
        entityId: fichesData[0].id,
        meta: { state: 'DRAFT' }
      },
      {
        actorId: usersData[1].id,
        action: 'state_transition',
        entity: 'FicheNavette',
        entityId: fichesData[0].id,
        meta: { oldState: 'DRAFT', newState: 'SUBMITTED_TO_FEVES' }
      },
      {
        actorId: usersData[2].id,
        action: 'assign',
        entity: 'FicheNavette',
        entityId: fichesData[1].id,
        meta: { assignedOrgId: orgsData[1].id }
      },
      {
        actorId: usersData[3].id,
        action: 'state_transition',
        entity: 'FicheNavette',
        entityId: fichesData[1].id,
        meta: { oldState: 'ASSIGNED_TO_EVS', newState: 'EVS_ACCEPTED' }
      }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('ADMIN: admin@passerelle.cap / Admin!234');
    console.log('EMETTEUR: emetteur@tas.cap / Demo!123');
    console.log('RELATIONS_EVS: relations@feves.cap / Demo!123');
    console.log('EVS_CS: evs@association.cap / Demo!123');
    console.log('SUIVI_PROJETS: suivi@feves.cap / Demo!123');
    console.log('\n🏢 Created:');
    console.log(`- ${epsiData.length} EPSI`);
    console.log(`- ${orgsData.length} Organizations`);
    console.log(`- ${objectivesData.length} Workshop Objectives`);
    console.log(`- ${workshopsData.length} Workshops`);
    console.log(`- ${usersData.length} Users`);
    console.log(`- ${familiesData.length} Families`);
    console.log(`- ${fichesData.length} Demo Fiches`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
