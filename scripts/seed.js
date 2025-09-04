import bcrypt from 'bcryptjs';
import { db } from '../server/db.ts';
import {
  users, epcis, organizations, workshopObjectives,
  workshops, ficheNavettes, auditLogs, comments
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
    await db.delete(ficheNavettes);
    await db.delete(workshops);
    await db.delete(workshopObjectives);
    await db.delete(users);
    await db.delete(organizations);
    await db.delete(epcis);

    // Seed EPCIs
    console.log('🏢 Creating EPCIs...');
    const epcisData = await db.insert(epcis).values([
      { name: 'EPCI Nord Pas-de-Calais' },
      { name: 'EPCI Métropole Lilloise' },
      { name: 'EPCI Côte d\'Opale' },
      { name: 'EPCI Valenciennes Hainaut' },
      { name: 'EPCI Artois-Ternois' },
      { name: 'EPCI Flandre-Lys' },
      { name: 'EPCI test' }
    ]).returning();

    // Seed Organizations
    console.log('🏛️  Creating Organizations...');
    const orgsData = await db.insert(organizations).values([
      // EPCI Nord Pas-de-Calais
      {
        name: 'EVS Solidarité Nord',
        type: 'EVS',
        address: '15 rue de la Paix, 59000 Lille',
        contactPersonName: 'Marie Dupont',
        contactEmail: 'marie.dupont@evs-nord.fr',
        contactPhone: '03 20 12 34 56',
        epciId: epcisData[0].id
      },
      {
        name: 'Centre Social Horizon',
        type: 'CS',
        address: '42 avenue de la République, 59100 Roubaix',
        contactPersonName: 'Jean Martin',
        contactEmail: 'jean.martin@cs-horizon.fr',
        contactPhone: '03 20 23 45 67',
        epciId: epcisData[0].id
      },
      {
        name: 'Association Entraide Familiale',
        type: 'OTHER',
        address: '8 place de la Liberté, 59200 Tourcoing',
        contactPersonName: 'Sophie Rousseau',
        contactEmail: 'sophie.rousseau@entraide-familiale.fr',
        contactPhone: '03 20 34 56 78',
        epciId: epcisData[0].id
      },
      
      // EPCI Métropole Lilloise
      {
        name: 'EVS Métropole',
        type: 'EVS',
        address: '25 boulevard Victor Hugo, 59000 Lille',
        contactPersonName: 'Pierre Durand',
        contactEmail: 'pierre.durand@evs-metropole.fr',
        contactPhone: '03 20 45 67 89',
        epciId: epcisData[1].id
      },
      {
        name: 'Centre Social Villeneuve',
        type: 'CS',
        address: '18 rue des Roses, 59650 Villeneuve-d\'Ascq',
        contactPersonName: 'Claire Moreau',
        contactEmail: 'claire.moreau@cs-villeneuve.fr',
        contactPhone: '03 20 56 78 90',
        epciId: epcisData[1].id
      },
      
      // EPCI Côte d'Opale
      {
        name: 'EVS Littoral',
        type: 'EVS',
        address: '12 quai des Pêcheurs, 62100 Calais',
        contactPersonName: 'Michel Blanc',
        contactEmail: 'michel.blanc@evs-littoral.fr',
        contactPhone: '03 21 12 34 56',
        epciId: epcisData[2].id
      },
      {
        name: 'Centre Social Maritime',
        type: 'CS',
        address: '30 rue de la Mer, 62200 Boulogne-sur-Mer',
        contactPersonName: 'Anne Dubois',
        contactEmail: 'anne.dubois@cs-maritime.fr',
        contactPhone: '03 21 23 45 67',
        epciId: epcisData[2].id
      },
      
      // EPCI Valenciennes Hainaut
      {
        name: 'EVS Hainaut',
        type: 'EVS',
        address: '40 avenue de la Gare, 59300 Valenciennes',
        contactPersonName: 'Laurent Petit',
        contactEmail: 'laurent.petit@evs-hainaut.fr',
        contactPhone: '03 27 12 34 56',
        epciId: epcisData[3].id
      },
      {
        name: 'Centre Social Escaut',
        type: 'CS',
        address: '22 place d\'Armes, 59300 Valenciennes',
        contactPersonName: 'Nathalie Grand',
        contactEmail: 'nathalie.grand@cs-escaut.fr',
        contactPhone: '03 27 23 45 67',
        epciId: epcisData[3].id
      },
      
      // EPCI Artois-Ternois
      {
        name: 'EVS Artois',
        type: 'EVS',
        address: '15 rue Saint-Bertin, 62000 Arras',
        contactPersonName: 'Patrick Lebrun',
        contactEmail: 'patrick.lebrun@evs-artois.fr',
        contactPhone: '03 21 34 56 78',
        epciId: epcisData[4].id
      },
      {
        name: 'Centre Social Ternois',
        type: 'CS',
        address: '5 place des Héros, 62130 Saint-Pol-sur-Ternoise',
        contactPersonName: 'Véronique Leroy',
        contactEmail: 'veronique.leroy@cs-ternois.fr',
        contactPhone: '03 21 45 67 89',
        epciId: epcisData[4].id
      },
      
      // EPCI Flandre-Lys
      {
        name: 'EVS Flandre',
        type: 'EVS',
        address: '28 Grand-Place, 59190 Hazebrouck',
        contactPersonName: 'Thierry Vandenbroucke',
        contactEmail: 'thierry.vandenbroucke@evs-flandre.fr',
        contactPhone: '03 28 12 34 56',
        epciId: epcisData[5].id
      },
      {
        name: 'Centre Social Lys',
        type: 'CS',
        address: '33 rue de la Lys, 59190 Hazebrouck',
        contactPersonName: 'Isabelle Vandenberghe',
        contactEmail: 'isabelle.vandenberghe@cs-lys.fr',
        contactPhone: '03 28 23 45 67',
        epciId: epcisData[5].id
      },
      
      // EPCI test
      {
        name: 'EVS test',
        type: 'EVS',
        address: '1 rue de Test, 00000 Test City',
        contactPersonName: 'Gregory Boil',
        contactEmail: 'gregory.boil@gmail.com',
        contactPhone: '01 23 45 67 89',
        epciId: epcisData[6].id
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
        orgId: orgsData[0].id
      },
      {
        email: 'relations@feves.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Jean',
        lastName: 'Martin',
        role: 'RELATIONS_EVS',
        orgId: orgsData[0].id
      },
      {
        email: 'evs@association.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Sophie',
        lastName: 'Rousseau',
        role: 'EVS_CS',
        orgId: orgsData[0].id,
        orgId: orgsData[0].id
      },
      {
        email: 'suivi@feves.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Pierre',
        lastName: 'Blanc',
        role: 'SUIVI_PROJETS',
        orgId: orgsData[0].id
      },
      {
        email: 'evs2@horizon.cap',
        passwordHash: await hashPassword('Demo!123'),
        firstName: 'Annie',
        lastName: 'Weber',
        role: 'EVS_CS',
        orgId: orgsData[1].id,
        orgId: orgsData[0].id
      }
    ]).returning();

    // Predefined family data used within fiche records
    const familySeedData = [
      {
        id: 'FAM-456',
        detailed: {
          code: 'FAM-456',
          adresse: '12 rue de la Liberté, 75012 Paris',
          telephonePortable: '01 42 34 56 78',
          email: 'famille.martin@email.fr',
          mother: 'Catherine Martin',
          father: 'Philippe Martin',
          notes: 'Famille monoparentale avec deux enfants en difficulté scolaire'
        },
        children: [
          { firstName: 'Lucas', birthDate: new Date('2015-03-15'), level: 'CE2' },
          { firstName: 'Emma', birthDate: new Date('2017-09-20'), level: 'CP' }
        ]
      },
      {
        id: 'FAM-789',
        detailed: {
          code: 'FAM-789',
          adresse: '8 avenue des Roses, 69003 Lyon',
          telephonePortable: '04 78 12 34 56',
          email: 'dubois.famille@gmail.com',
          mother: 'Sarah Dubois',
          guardian: 'Grand-mère: Jeanne Dubois',
          notes: "Mère seule avec trois enfants, besoin d'accompagnement parental"
        },
        children: [
          { firstName: 'Thomas', birthDate: new Date('2014-01-10'), level: 'CM1' },
          { firstName: 'Léa', birthDate: new Date('2016-06-05'), level: 'CE1' },
          { firstName: 'Noah', birthDate: new Date('2018-11-12'), level: 'Maternelle' }
        ]
      },
      {
        id: 'FAM-123',
        detailed: {
          code: 'FAM-123',
          adresse: '25 place du Marché, 13005 Marseille',
          telephonePortable: '04 91 65 43 21',
          email: 'garcia.family@outlook.fr',
          mother: 'Maria Garcia',
          father: 'Carlos Garcia',
          notes: "Famille d'origine étrangère, difficultés d'intégration"
        },
        children: [
          { firstName: 'Sofia', birthDate: new Date('2013-08-25'), level: '6ème' },
          { firstName: 'Diego', birthDate: new Date('2015-12-03'), level: 'CE2' }
        ]
      }
    ];

    // Seed Demo Fiches
    console.log('📋 Creating demo fiches...');
    const workshopsData = await db.select().from(workshops);
    const fichesData = await db.insert(ficheNavettes).values([
      {
        ref: 'FN-2024-001',
        state: 'SUBMITTED_TO_FEVES',
        emitterId: usersData[1].id, // Marie Dupont (EMETTEUR)
        orgId: orgsData[0].id,
        description: 'Famille monoparentale avec deux enfants en difficulté scolaire. Besoin d\'accompagnement pour améliorer la communication et établir des routines éducatives.',
        familyDetailedData: familySeedData[0].detailed,
        childrenData: familySeedData[0].children,
        workshopPropositions: {
          [workshopsData[0].id]: 'Communication parent-enfant',
          [workshopsData[3].id]: 'Ateliers famille'
        },
        createdAt: new Date('2024-01-15T09:30:00Z'),
        updatedAt: new Date('2024-01-15T14:20:00Z')
      },
      {
        ref: 'FN-2024-002',
        state: 'EVS_ACCEPTED',
        emitterId: usersData[1].id,
        assignedOrgId: orgsData[1].id,
        orgId: orgsData[0].id,
        description: 'Mère seule avec trois enfants, demande d\'accompagnement pour gestion du stress parental et activités en famille.',
        familyDetailedData: familySeedData[1].detailed,
        childrenData: familySeedData[1].children,
        workshopPropositions: {
          [workshopsData[1].id]: 'Gestion des émotions',
          [workshopsData[6].id]: 'Sport collectif famille'
        },
        createdAt: new Date('2024-01-12T10:15:00Z'),
        updatedAt: new Date('2024-01-18T16:30:00Z')
      },
      {
        ref: 'FN-2024-003',
        state: 'CLOSED',
        emitterId: usersData[1].id,
        assignedOrgId: orgsData[2].id,
        epsiId: epcisData[1].id,
        description: 'Famille d\'origine étrangère, besoin d\'accompagnement pour l\'intégration et la communication intergénérationnelle.',
        familyDetailedData: familySeedData[2].detailed,
        childrenData: familySeedData[2].children,
        workshopPropositions: {
          [workshopsData[4].id]: 'Médiation familiale',
          [workshopsData[5].id]: 'Dialogue intergénérationnel'
        },
        createdAt: new Date('2024-01-08T08:45:00Z'),
        updatedAt: new Date('2024-01-25T17:00:00Z')
      }
    ]).returning();

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
    console.log(`- ${epcisData.length} EPSI`);
    console.log(`- ${orgsData.length} Organizations`);
    console.log(`- ${objectivesData.length} Workshop Objectives`);
    console.log(`- ${workshopsData.length} Workshops`);
    console.log(`- ${usersData.length} Users`);
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
