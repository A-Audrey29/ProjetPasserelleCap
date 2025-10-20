--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (165f042)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: fiche_state; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.fiche_state AS ENUM (
    'DRAFT',
    'SUBMITTED_TO_CD',
    'SUBMITTED_TO_FEVES',
    'ASSIGNED_EVS',
    'ACCEPTED_EVS',
    'EVS_REJECTED',
    'NEEDS_INFO',
    'CONTRACT_SIGNED',
    'ACTIVITY_DONE',
    'FIELD_CHECK_SCHEDULED',
    'FIELD_CHECK_DONE',
    'CLOSED',
    'ARCHIVED'
);


ALTER TYPE public.fiche_state OWNER TO neondb_owner;

--
-- Name: org_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.org_type AS ENUM (
    'EVS',
    'CS',
    'OTHER'
);


ALTER TYPE public.org_type OWNER TO neondb_owner;

--
-- Name: role; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.role AS ENUM (
    'ADMIN',
    'SUIVI_PROJETS',
    'EMETTEUR',
    'RELATIONS_EVS',
    'EVS_CS',
    'CD'
);


ALTER TYPE public.role OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    actor_id character varying,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id character varying NOT NULL,
    meta json,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    fiche_id character varying NOT NULL,
    author_id character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO neondb_owner;

--
-- Name: epcis; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.epcis (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.epcis OWNER TO neondb_owner;

--
-- Name: fiche_navettes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fiche_navettes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    ref text NOT NULL,
    state public.fiche_state DEFAULT 'DRAFT'::public.fiche_state NOT NULL,
    emitter_id character varying NOT NULL,
    assigned_org_id character varying,
    description text,
    referent_data json,
    family_detailed_data json,
    children_data json,
    workshop_propositions json,
    family_consent boolean DEFAULT false NOT NULL,
    contract_signed boolean DEFAULT false NOT NULL,
    advance_payment_sent boolean DEFAULT false NOT NULL,
    contract_verified_by character varying,
    contract_verified_at timestamp without time zone,
    activity_completed boolean DEFAULT false NOT NULL,
    activity_completed_by character varying,
    activity_completed_at timestamp without time zone,
    field_check_completed boolean DEFAULT false NOT NULL,
    field_check_completed_by character varying,
    field_check_completed_at timestamp without time zone,
    final_report_sent boolean DEFAULT false NOT NULL,
    remaining_payment_sent boolean DEFAULT false NOT NULL,
    final_verification_by character varying,
    final_verification_at timestamp without time zone,
    total_amount integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fiche_navettes OWNER TO neondb_owner;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.organizations (
    org_id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact text,
    contact_name text,
    contact_email text,
    contact_phone text,
    epci text,
    epci_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organizations OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role public.role NOT NULL,
    structure text,
    phone text,
    org_id character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: workshop_objectives; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workshop_objectives (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "order" integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workshop_objectives OWNER TO neondb_owner;

--
-- Name: workshops; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workshops (
    id character varying NOT NULL,
    objective_id character varying NOT NULL,
    name text NOT NULL,
    description text
);


ALTER TABLE public.workshops OWNER TO neondb_owner;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, actor_id, action, entity, entity_id, meta, created_at) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comments (id, fiche_id, author_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: epcis; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.epcis (id, name, created_at) FROM stdin;
baa67d1d-c50b-405b-9ad1-b913e8e24549	Cap Excellence	2025-10-20 14:30:05.660183
c81e797a-59c3-4921-8cbf-8f241cfa3ded	Communauté de communes de Marie-Galante (CCMG)	2025-10-20 14:30:05.777476
1105340b-d919-489d-a5f0-49b0e978ef9d	Grand Sud Caraïbe	2025-10-20 14:30:05.890303
44062df8-ecf4-46fc-a549-db6f5bc60799	Nord Basse-Terre (CANBT)	2025-10-20 14:30:06.003973
64b1f39b-2350-4b87-be7b-2ce57a7fcb41	Nord Grande-Terre (CANGT)	2025-10-20 14:30:06.116898
cb55307e-107b-4548-b171-d4df872f8dd5	La Riviéra du Levant (CARL)	2025-10-20 14:30:06.233599
\.


--
-- Data for Name: fiche_navettes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.fiche_navettes (id, ref, state, emitter_id, assigned_org_id, description, referent_data, family_detailed_data, children_data, workshop_propositions, family_consent, contract_signed, advance_payment_sent, contract_verified_by, contract_verified_at, activity_completed, activity_completed_by, activity_completed_at, field_check_completed, field_check_completed_by, field_check_completed_at, final_report_sent, remaining_payment_sent, final_verification_by, final_verification_at, total_amount, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.organizations (org_id, name, contact, contact_name, contact_email, contact_phone, epci, epci_id, created_at) FROM stdin;
0fa66c85-c05f-4234-aecd-9b26660ce8e4	CENTRE SOCIAL DE LACROIX	Les Abymes	ACCAJOU Nadine	naccajou@ville-des-abymes.fr	0690 33 09 44	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:06.458626
ac9e742a-5996-4d42-a5e3-8f320a61d8d3	CENTRE SOCIAL GRAND CAMP	Les Abymes	ESNARD Tatiana	tesnard@ville-des-abymes.fr	0690 63 09 73	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:06.69068
b6111434-6d14-4875-acb0-4018dff09712	CENTRE SPORTIF SOCIO-CULTUREL EMMANUEL ALBON	Les Abymes	FOSTIN Ingrid	ifostin@ville-des-abymes.fr	0690 33 09 44	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:06.915638
e9a03b46-adc8-4d8b-bb68-744947bee9bc	MAISON DES JEUNES ET DE LA CULTURE DES ABYMES	Les Abymes	JAVOIS Jean	mjcabymes@wanadoo.fr	0690 63 34 18	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:07.141074
29bca6df-9acf-4876-81fa-daa65e1da814	CENTRE SOCIAL PETIT PEROU	Les Abymes	FANHAN Patrice	pfanhan@ville-des-abymes.fr	0690 29 67 78	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:07.366041
c6a279ae-7820-4cff-aa42-bbd517a6e946	AMICAL CLUB DARBOUSSIER (ACD) ou Centre Social	Pointe-à-Pitre	Claude Gilbert	contact@ac-darboussier.fr	\N	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:07.590213
f8079792-2974-45cb-b85b-6c50a428a82b	Ambition Marie Galante	Capesterre-de-Marie-Galante	BERSY Betty	bettybesry@gmail.com	0690 55 67 62	Communauté de communes de Marie-Galante (CCMG)	c81e797a-59c3-4921-8cbf-8f241cfa3ded	2025-10-20 14:30:07.815139
499216ee-47b6-4214-b8d5-ce1e6fe09102	LA KRIZALID- LA BELLE CREOLE	Basse-Terre	SANDOZ Michel	contact@federationlabellecreole.fr	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:08.040127
effb1da2-67b8-415c-a294-786efba1dc96	CENTRE SOCIAL BELLE EAU	Capesterre-Belle-Eau	NEMORIN Pascal	pascal.nemorin@wanadoo.fr	06 90 73 53 43	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:08.265724
c3a1cba9-54e2-4a51-b1c4-dde9b0971462	MAISON DE L'INSERTION	Gourbeyre	JOUYET Josy	josy.jouyet@outlook.com	0690 59 39 68	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:08.490483
037ab99a-8f98-4736-8fd0-698e9e2f3170	CKB HAUTEUR LEZARDE-ASSOCIATION CKB	Petit-Bourg	POLTER KELLY	ckb97170@gmail.com	0690 08 00 50	Nord Basse-Terre (CANBT)	44062df8-ecf4-46fc-a549-db6f5bc60799	2025-10-20 14:30:08.715533
1dddc8a5-ed00-464b-ab2b-b8f8180a5e75	FRED CITADELLE - CENTRE SOCIAL de Sainte-Rose	Sainte-Rose	CITADELLE Fred	citadelle.fred@gmail.com	\N	Nord Basse-Terre (CANBT)	44062df8-ecf4-46fc-a549-db6f5bc60799	2025-10-20 14:30:08.941981
cd6fcdfe-5f2a-444f-b116-fddb25444a65	UDAF VFE	Port-Louis	LARA Yorrick	ylara@udaf971.fr	\N	Nord Grande-Terre (CANGT)	64b1f39b-2350-4b87-be7b-2ce57a7fcb41	2025-10-20 14:30:09.167174
9cbc9db8-6ce1-4cda-8268-8ddd853cd6b2	CENTRE SOCIAL LE MOULE - Centre de Développement Humain (C.D.H)	Le Moule	CABARRUS Carole	carole.cabarrus@mairie-lemoule.fr	0690 54 46 29	Nord Grande-Terre (CANGT)	64b1f39b-2350-4b87-be7b-2ce57a7fcb41	2025-10-20 14:30:09.39231
c634ca69-cd17-4033-8eeb-251b965395b6	LES BRAS OUVERTS	Morne-à-l'Eau	ZENON Ginette	lbo97111@gmail.com	0690 65 93 12	Nord Grande-Terre (CANGT)	64b1f39b-2350-4b87-be7b-2ce57a7fcb41	2025-10-20 14:30:09.61704
1a24c9c8-96a9-478c-8cb4-bc28e3bc2c2f	FROMAGER	Les Abymes	\N	asso.fromager@gmail.com	\N	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:09.840698
b9c1221a-e84a-45fc-96ef-714f18e39aa9	100%FAMILLE	Grand-Bourg	MONTELLA Thierry	asso100famille@gmail.com	06 60 74 32 08	Communauté de communes de Marie-Galante (CCMG)	c81e797a-59c3-4921-8cbf-8f241cfa3ded	2025-10-20 14:30:10.069163
fc5422ee-3e3f-49de-828d-f6c4d37017aa	MAISON DES PARENTS ET DE LA FAMILLE	Bouillante	GACE Françoise	yolene.gace@gmail.com	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:10.294017
39f84f32-d75f-4795-81cd-c70f81fa617d	OMCSL	Terre-de-Bas	\N	omcsl971@orange.fr	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:10.518914
ce23062e-5ff5-4282-96f6-e3b11697cdd3	LALIWONDAJ A TI MOUN	Le Moule	DUCELIER Jacqueline	jd.latm@gmail.com	0690 62 64 87	Nord Grande-Terre (CANGT)	64b1f39b-2350-4b87-be7b-2ce57a7fcb41	2025-10-20 14:30:10.743635
b0cdde92-baae-436a-8ff7-00239b6da334	AEP Ass enfants Parents	Les Abymes	LOUDAC Jacqueline	enfantsparents971@gmail.com	0690 67 21 51	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:10.969076
f5a73cf9-329a-4499-9096-2b8d34e792d9	LA PUCE A L'OREILLE	Les Abymes	THOUMSON Cédric	toumsonc@gmail.com	06 90 76 18 01	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:11.192785
fe45f45f-2501-469c-b8d9-887d793c6b3a	AJTS	Les Abymes	GIFT Julien	rodriguegift1970@gmail.com	0690 60 76 49	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:11.417144
b8d47286-b316-4387-b297-977de6cd838d	LA TYROLIENNE	Pointe-à-Pitre	NANETTE Erick	ass.latyrolienne@orange.fr	\N	Cap Excellence	baa67d1d-c50b-405b-9ad1-b913e8e24549	2025-10-20 14:30:11.642396
adb3961b-1d73-4697-bb63-a1c9d961967c	LES PETITES BATTERIES	Baillif	BEELMEON Cyndi	gestion.assolespetitesbatteries@gmail.com	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:11.867166
91adc033-8483-4a00-895b-307821612e29	EVS BOKANTAJ ou LE COLECTIF D'OKTAV	Capesterre-Belle-Eau	\N	secretariatcollectifoktav@gmail.com	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:12.092196
d79d41f6-83ad-469a-9987-7cd6af760b9e	EVS LE MARQUIS ou ASSOCIATION DES LOCATAIRES DE LOIC PETIT	Capesterre-Belle-Eau	SIARRAS Véronique	siarras.veronique@hotmail.fr	0690 91 68 05	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:12.317435
3b3abfe8-c9af-4aa8-99a5-dee83959534b	EVS BANANIER	Capesterre-Belle-Eau	MARTIAS Nadia	nadiamartias76@gmail.com	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:12.542377
ec094ce5-d206-4867-8677-9974fdeeebe7	BOUKAN NYE	Gourbeyre	\N	boukannye97113@gmail.com	\N	Grand Sud Caraïbe	1105340b-d919-489d-a5f0-49b0e978ef9d	2025-10-20 14:30:12.76697
60e1a204-2d99-4bba-b706-3c5e1c25c0b8	CORRESPON'DANSE	Sainte-Anne	\N	correspondance97180@gmail.com	\N	La Riviéra du Levant (CARL)	cb55307e-107b-4548-b171-d4df872f8dd5	2025-10-20 14:30:12.991326
939c36ba-51e6-49c1-a132-055b9f9a4368	FIAT LUX	Sainte-Anne	\N	fiatlux.grandsfonds97180@gmail.com	\N	La Riviéra du Levant (CARL)	cb55307e-107b-4548-b171-d4df872f8dd5	2025-10-20 14:30:13.217058
7d8c26c1-5e95-4f58-9e9d-77c36c28bd97	DYNAMIC 3A	Sainte-Anne	\N	\N	\N	La Riviéra du Levant (CARL)	cb55307e-107b-4548-b171-d4df872f8dd5	2025-10-20 14:30:13.442441
bd03d479-92d3-4764-8093-21816a8bf041	CARREFOUR DES RYTHMES GUADELOUPE PERCUSSION ART	Sainte-Anne	\N	percussion.art@wanadoo.fr	\N	La Riviéra du Levant (CARL)	cb55307e-107b-4548-b171-d4df872f8dd5	2025-10-20 14:30:13.667431
2a814e50-65b9-4217-ae6a-623af3ffab20	EVS LA CHALOUPE	Désirade	\N	spraid971@orange.fr	\N	La Riviéra du Levant (CARL)	cb55307e-107b-4548-b171-d4df872f8dd5	2025-10-20 14:30:13.892714
1d0d00bc-7ea3-45e5-939c-56ae049a150e	KELISHA ENTR'AIDE	Sainte-Rose	PETER Sophie	kelysha.entraide@gmail.com	\N	Nord Basse-Terre (CANBT)	44062df8-ecf4-46fc-a549-db6f5bc60799	2025-10-20 14:30:14.117483
c6a9701e-bcd9-4af9-ad3b-0fd0bd3027ba	ECLAT DE QUARTIER	Le Moule	THETIS Rosette	eclatsdequartiers@gmail.com	\N	Nord Grande-Terre (CANGT)	64b1f39b-2350-4b87-be7b-2ce57a7fcb41	2025-10-20 14:30:14.342159
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, password_hash, first_name, last_name, role, structure, phone, org_id, is_active, created_at, updated_at) FROM stdin;
b23dc90f-40f4-4df2-b2cf-1ff906404413	admin@example.com	$2b$12$xXUB/ExwsriuwbvKcDpjiuNrn4GV060V0KY5HGm4oghbxOC7xD/ZG	Admin	User	ADMIN	\N	\N	\N	t	2025-09-18 20:06:55.271319	2025-09-18 20:06:55.271319
ebe26544-7933-4162-b223-c4cc367d7514	admin@passerelle.cap	$2b$10$L/bDs8LBHcaanvK5yE6NY.Nr1IUSoy2YwYkMERCxscgpBxObf6NFG	Admin	Passerelle CAP	ADMIN	Administration	\N	\N	t	2025-10-20 14:27:09.702705	2025-10-20 14:27:09.702705
\.


--
-- Data for Name: workshop_objectives; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workshop_objectives (id, code, name, description, "order", created_at) FROM stdin;
\.


--
-- Data for Name: workshops; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workshops (id, objective_id, name, description) FROM stdin;
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: epcis epcis_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.epcis
    ADD CONSTRAINT epcis_name_unique UNIQUE (name);


--
-- Name: epcis epcis_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.epcis
    ADD CONSTRAINT epcis_pkey PRIMARY KEY (id);


--
-- Name: fiche_navettes fiche_navettes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fiche_navettes
    ADD CONSTRAINT fiche_navettes_pkey PRIMARY KEY (id);


--
-- Name: fiche_navettes fiche_navettes_ref_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fiche_navettes
    ADD CONSTRAINT fiche_navettes_ref_unique UNIQUE (ref);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (org_id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workshop_objectives workshop_objectives_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workshop_objectives
    ADD CONSTRAINT workshop_objectives_code_unique UNIQUE (code);


--
-- Name: workshop_objectives workshop_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workshop_objectives
    ADD CONSTRAINT workshop_objectives_pkey PRIMARY KEY (id);


--
-- Name: workshops workshops_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workshops
    ADD CONSTRAINT workshops_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_actor_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity_id);


--
-- Name: comments_fiche_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX comments_fiche_idx ON public.comments USING btree (fiche_id);


--
-- Name: epcis_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX epcis_name_idx ON public.epcis USING btree (name);


--
-- Name: fiche_navettes_assigned_org_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiche_navettes_assigned_org_idx ON public.fiche_navettes USING btree (assigned_org_id);


--
-- Name: fiche_navettes_emitter_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiche_navettes_emitter_idx ON public.fiche_navettes USING btree (emitter_id);


--
-- Name: fiche_navettes_ref_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiche_navettes_ref_idx ON public.fiche_navettes USING btree (ref);


--
-- Name: fiche_navettes_state_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX fiche_navettes_state_idx ON public.fiche_navettes USING btree (state);


--
-- Name: organizations_epci_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX organizations_epci_idx ON public.organizations USING btree (epci_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: workshops_objective_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workshops_objective_idx ON public.workshops USING btree (objective_id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

