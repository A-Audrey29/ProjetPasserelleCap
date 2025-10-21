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
-- Name: email_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.email_status AS ENUM (
    'intercepted',
    'sent',
    'viewed',
    'archived',
    'error'
);


ALTER TYPE public.email_status OWNER TO neondb_owner;

--
-- Name: fiche_state; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.fiche_state AS ENUM (
    'DRAFT',
    'SUBMITTED_TO_FEVES',
    'ASSIGNED_EVS',
    'ACCEPTED_EVS',
    'EVS_REJECTED',
    'CONTRACT_SIGNED',
    'ACTIVITY_DONE',
    'FIELD_CHECK_SCHEDULED',
    'FIELD_CHECK_DONE',
    'FINAL_REPORT_RECEIVED',
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
-- Name: email_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.email_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    "to" json NOT NULL,
    cc json,
    bcc json,
    subject text NOT NULL,
    text text,
    html text NOT NULL,
    meta json,
    status public.email_status DEFAULT 'intercepted'::public.email_status NOT NULL,
    error text,
    message_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    viewed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_logs OWNER TO neondb_owner;

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
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    selected_workshops json,
    participants_count integer DEFAULT 1,
    cap_documents json,
    state public.fiche_state DEFAULT 'DRAFT'::public.fiche_state NOT NULL
);


ALTER TABLE public.fiche_navettes OWNER TO neondb_owner;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.migrations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    checksum text NOT NULL,
    metadata json,
    executed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.migrations OWNER TO neondb_owner;

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
-- Name: workshop_enrollments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workshop_enrollments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    fiche_id character varying NOT NULL,
    workshop_id character varying NOT NULL,
    evs_id character varying NOT NULL,
    participant_count integer NOT NULL,
    session_number integer DEFAULT 1 NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    min_capacity_notification_sent boolean DEFAULT false NOT NULL,
    contract_signed_by_evs boolean DEFAULT false NOT NULL,
    contract_signed_by_commune boolean DEFAULT false NOT NULL,
    contract_commune_pdf_url text,
    contract_signed_at timestamp without time zone,
    activity_done boolean DEFAULT false NOT NULL,
    activity_completed_at timestamp without time zone,
    control_scheduled boolean DEFAULT false NOT NULL,
    control_validated_at timestamp without time zone,
    report_url text,
    report_uploaded_at timestamp without time zone,
    report_uploaded_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workshop_enrollments OWNER TO neondb_owner;

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
    description text,
    min_capacity integer,
    max_capacity integer
);


ALTER TABLE public.workshops OWNER TO neondb_owner;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, actor_id, action, entity, entity_id, meta, created_at) FROM stdin;
c2a41098-d8f2-46be-8e5d-ec9d7b46f009	ebe26544-7933-4162-b223-c4cc367d7514	create	User	unknown	{"method":"POST","path":"/api/admin/users","userAgent":"curl/8.14.1","ip":"127.0.0.1"}	2025-10-20 16:58:23.033182
2e908d76-0c11-4de2-9e75-75183edda929	ebe26544-7933-4162-b223-c4cc367d7514	create	User	unknown	{"method":"POST","path":"/api/admin/users","userAgent":"curl/8.14.1","ip":"127.0.0.1"}	2025-10-20 16:58:24.142536
3cb8a08d-2f86-4e21-8e88-f20291d53153	ebe26544-7933-4162-b223-c4cc367d7514	create	User	unknown	{"method":"POST","path":"/api/admin/users","userAgent":"curl/8.14.1","ip":"127.0.0.1"}	2025-10-20 16:58:25.587355
d3d8fa3e-1de2-4a23-8b08-197b3acf3383	ebe26544-7933-4162-b223-c4cc367d7514	update	User	13794d89-5e47-48a0-95f1-6391918fb799	{"method":"PUT","path":"/api/admin/users/13794d89-5e47-48a0-95f1-6391918fb799","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.4.129"}	2025-10-20 17:09:48.639498
c03fe462-4b0b-45b6-8e88-7a91b498cfa7	ebe26544-7933-4162-b223-c4cc367d7514	update	User	5f69b418-8f0f-40bf-8ff1-6163fac22f90	{"method":"PUT","path":"/api/admin/users/5f69b418-8f0f-40bf-8ff1-6163fac22f90","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.11.30"}	2025-10-20 17:10:21.795251
6a81104f-1932-49ef-ab1b-8c85853d1eab	5f69b418-8f0f-40bf-8ff1-6163fac22f90	create	FicheNavette	unknown	{"method":"POST","path":"/api/fiches","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.12.233"}	2025-10-20 17:38:57.717388
d917869b-7786-453e-81ce-36df070a02dc	5f69b418-8f0f-40bf-8ff1-6163fac22f90	comment	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"method":"POST","path":"/api/fiches/43841ebc-bc19-411d-b648-0979219dbff2/comments","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.1.240"}	2025-10-20 17:39:07.431819
ec2dc9f5-483d-471e-97cc-efd2edcfbd3a	5f69b418-8f0f-40bf-8ff1-6163fac22f90	state_transition	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"oldState":"DRAFT","newState":"SUBMITTED_TO_FEVES","transmittedBy":"5f69b418-8f0f-40bf-8ff1-6163fac22f90","transmissionDate":"2025-10-20T17:39:29.790Z"}	2025-10-20 17:39:31.053586
0f506c79-e25b-41d1-9c05-c9eff8ff35e8	5f69b418-8f0f-40bf-8ff1-6163fac22f90	transition	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"method":"POST","path":"/api/fiches/43841ebc-bc19-411d-b648-0979219dbff2/transition","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.4.129"}	2025-10-20 17:39:31.404161
0e21082b-8ea4-4f12-aff7-9e119a17ead9	13794d89-5e47-48a0-95f1-6391918fb799	state_transition	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"oldState":"SUBMITTED_TO_FEVES","newState":"ASSIGNED_EVS","assignedOrgId":"b0cdde92-baae-436a-8ff7-00239b6da334","assignedOrgName":"AEP Ass enfants Parents","assignedAt":"2025-10-20T17:44:06.256Z"}	2025-10-20 17:44:07.507032
cf5ab026-f63f-443a-9bf2-645b0d2aa925	13794d89-5e47-48a0-95f1-6391918fb799	transition	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"method":"POST","path":"/api/fiches/43841ebc-bc19-411d-b648-0979219dbff2/transition","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.5.89"}	2025-10-20 17:44:07.856563
edea5f62-2c84-43ae-a6b8-c8018950c273	13794d89-5e47-48a0-95f1-6391918fb799	email_notification	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"notificationType":"evs_assignment","recipientEmail":"enfantsparents971@gmail.com","recipientName":"LOUDAC Jacqueline","orgId":"b0cdde92-baae-436a-8ff7-00239b6da334","orgName":"AEP Ass enfants Parents","emailSuccess":true}	2025-10-20 17:44:08.448698
dd6f1007-cf72-4dc2-bba8-8d4f73c3924e	13794d89-5e47-48a0-95f1-6391918fb799	comment	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"method":"POST","path":"/api/fiches/43841ebc-bc19-411d-b648-0979219dbff2/comments","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.3.109"}	2025-10-20 17:44:23.947906
86a66c46-70f1-42d2-baba-302a1dd3839d	ebe26544-7933-4162-b223-c4cc367d7514	create	User	unknown	{"method":"POST","path":"/api/admin/users","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.4.129"}	2025-10-20 17:47:54.219293
f759b647-1f3b-4a9d-9b42-37dd3b30b4ef	ebe26544-7933-4162-b223-c4cc367d7514	update	User	42690f8d-8286-4eff-8bb5-58af9827725b	{"method":"PUT","path":"/api/admin/users/42690f8d-8286-4eff-8bb5-58af9827725b","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.8.87"}	2025-10-20 17:48:14.961868
5210ce7e-a271-4b11-a3c4-bc23510469b4	42690f8d-8286-4eff-8bb5-58af9827725b	state_transition	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"oldState":"ASSIGNED_EVS","newState":"ACCEPTED_EVS","acceptedAt":"2025-10-20T17:48:55.678Z"}	2025-10-20 17:48:59.351179
fa63eb5b-f59e-48e4-9c44-74f85da6c897	42690f8d-8286-4eff-8bb5-58af9827725b	transition	FicheNavette	43841ebc-bc19-411d-b648-0979219dbff2	{"method":"POST","path":"/api/fiches/43841ebc-bc19-411d-b648-0979219dbff2/transition","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.12.233"}	2025-10-20 17:48:59.349489
5b6e2214-e504-4ca5-9834-0fbdb3d16a0c	ebe26544-7933-4162-b223-c4cc367d7514	create	User	unknown	{"method":"POST","path":"/api/admin/users","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.11.30"}	2025-10-20 17:51:10.198909
2f9f5734-8e81-4d5f-b9bf-aaef209b98bd	ebe26544-7933-4162-b223-c4cc367d7514	create	User	unknown	{"method":"POST","path":"/api/admin/users","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","ip":"10.81.8.87"}	2025-10-20 17:52:06.143453
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comments (id, fiche_id, author_id, content, created_at) FROM stdin;
d5522cbd-dca5-4360-a2ac-6af6da6a6464	43841ebc-bc19-411d-b648-0979219dbff2	5f69b418-8f0f-40bf-8ff1-6163fac22f90	test 1	2025-10-20 17:39:07.197759
2fcca916-272c-4810-85b5-7776f85e46fc	43841ebc-bc19-411d-b648-0979219dbff2	13794d89-5e47-48a0-95f1-6391918fb799	test commentaire feves	2025-10-20 17:44:23.717443
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.email_logs (id, "to", cc, bcc, subject, text, html, meta, status, error, message_id, created_at, viewed_at, updated_at) FROM stdin;
ad4b84de-93bb-4081-8648-4be60a6c2b4e	["relations@feves.cap"]	\N	\N	Nouvelle fiche CAP à traiter	\N	\n        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n          <h2 style="color: #6A8B74;">Nouvelle fiche CAP à traiter</h2>\n          \n          <p>Bonjour,</p>\n          \n          <p>Une nouvelle fiche CAP a été soumise et vous est maintenant transmise pour traitement.</p>\n          \n          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">\n            <p><strong>Référence :</strong> FN-2025-10-001</p>\n            <p><strong>Émetteur :</strong> Marie Émetteur</p>\n            <p><strong>Structure :</strong> assistante sociales basse terre</p>\n          </div>\n          \n          <p>Veuillez vous connecter à la plateforme pour examiner cette fiche et procéder à l'assignation EVS.</p>\n          \n          <div style="text-align: center; margin: 30px 0;">\n            <a href="http://localhost:5173/fiches/43841ebc-bc19-411d-b648-0979219dbff2" \n               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">\n              Traiter la fiche\n            </a>\n          </div>\n          \n          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">\n          \n          <p style="color: #666; font-size: 12px;">\n            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>\n            FEVES Guadeloupe et Saint-Martin\n          </p>\n        </div>\n      	{"event":"submitted_to_feves","ficheId":"43841ebc-bc19-411d-b648-0979219dbff2","ficheRef":"FN-2025-10-001","emitterName":"Marie Émetteur","emitterStructure":"assistante sociales basse terre","fevesEmails":["relations@feves.cap"]}	intercepted	\N	\N	2025-10-20 17:39:31.286148	\N	2025-10-20 17:39:31.286148
3bd6399f-09d7-4aef-a5b9-cf9a277bdfd4	["enfantsparents971@gmail.com"]	\N	\N	Nouvelle fiche CAP assignée	\n        Nouvelle fiche CAP assignée\n        \n        Bonjour LOUDAC Jacqueline,\n        \n        Une nouvelle fiche CAP vous a été assignée par l'équipe FEVES.\n        \n        Organisation : AEP Ass enfants Parents\n        Référence : FN-2025-10-001\n        \n        Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails.\n        \n        Lien : http://localhost:5173\n        \n        ---\n        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.\n        FEVES Guadeloupe et Saint-Martin\n      	\n        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n          <h2 style="color: #3B4B61;">Nouvelle fiche CAP assignée</h2>\n          \n          <p>Bonjour LOUDAC Jacqueline,</p>\n          \n          <p>Une nouvelle fiche CAP vous a été assignée par l'équipe FEVES.</p>\n          \n          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">\n            <p><strong>Organisation :</strong> AEP Ass enfants Parents</p>\n            <p><strong>Référence :</strong> FN-2025-10-001</p>\n          </div>\n          \n          <p>Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails de cette fiche et commencer l'accompagnement.</p>\n          \n          <div style="text-align: center; margin: 30px 0;">\n            <a href="http://localhost:5173" \n               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">\n              Accéder à la plateforme\n            </a>\n          </div>\n          \n          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">\n          \n          <p style="color: #666; font-size: 12px;">\n            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>\n            FEVES Guadeloupe et Saint-Martin\n          </p>\n        </div>\n      	{"event":"evs_assignment","ficheId":"43841ebc-bc19-411d-b648-0979219dbff2","orgName":"AEP Ass enfants Parents","contactEmail":"enfantsparents971@gmail.com"}	intercepted	\N	\N	2025-10-20 17:44:07.738259	\N	2025-10-20 17:44:07.738259
997ba916-d706-49c9-bb63-30ecdd78e63d	["enfantsparents971@gmail.com"]	\N	\N	Nouvelle fiche CAP assignée	\n        Nouvelle fiche CAP assignée\n        \n        Bonjour LOUDAC Jacqueline,\n        \n        Une nouvelle fiche CAP vous a été assignée par l'équipe FEVES.\n        \n        Organisation : AEP Ass enfants Parents\n        Référence : FN-2025-10-001\n        \n        Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails.\n        \n        Lien : http://localhost:5173\n        \n        ---\n        Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.\n        FEVES Guadeloupe et Saint-Martin\n      	\n        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n          <h2 style="color: #3B4B61;">Nouvelle fiche CAP assignée</h2>\n          \n          <p>Bonjour LOUDAC Jacqueline,</p>\n          \n          <p>Une nouvelle fiche CAP vous a été assignée par l'équipe FEVES.</p>\n          \n          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">\n            <p><strong>Organisation :</strong> AEP Ass enfants Parents</p>\n            <p><strong>Référence :</strong> FN-2025-10-001</p>\n          </div>\n          \n          <p>Veuillez vous connecter à la plateforme Passerelle CAP pour consulter les détails de cette fiche et commencer l'accompagnement.</p>\n          \n          <div style="text-align: center; margin: 30px 0;">\n            <a href="http://localhost:5173" \n               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">\n              Accéder à la plateforme\n            </a>\n          </div>\n          \n          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">\n          \n          <p style="color: #666; font-size: 12px;">\n            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>\n            FEVES Guadeloupe et Saint-Martin\n          </p>\n        </div>\n      	{"event":"evs_assignment","ficheId":"43841ebc-bc19-411d-b648-0979219dbff2","orgName":"AEP Ass enfants Parents","contactEmail":"enfantsparents971@gmail.com"}	intercepted	\N	\N	2025-10-20 17:44:08.334358	\N	2025-10-20 17:44:08.334358
0fcc4520-8b32-4969-b793-590040305059	["relations@feves.cap"]	\N	\N	Fiche CAP acceptée par l'EVS	\N	\n        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n          <h2 style="color: #6A8B74;">Fiche CAP acceptée par l'EVS</h2>\n          \n          <p>Bonjour,</p>\n          \n          <p>L'EVS a accepté la prise en charge de la fiche CAP et peut maintenant procéder à la signature du contrat.</p>\n          \n          <div style="background-color: #F5F6F7; padding: 15px; border-radius: 5px; margin: 20px 0;">\n            <p><strong>Référence :</strong> FN-2025-10-001</p>\n            <p><strong>EVS :</strong> AEP Ass enfants Parents</p>\n          </div>\n          \n          <p>Vous pouvez suivre l'avancement du processus dans la plateforme Passerelle CAP.</p>\n          \n          <div style="text-align: center; margin: 30px 0;">\n            <a href="http://localhost:5173/fiches/43841ebc-bc19-411d-b648-0979219dbff2" \n               style="background-color: #6A8B74; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">\n              Voir la fiche\n            </a>\n          </div>\n          \n          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">\n          \n          <p style="color: #666; font-size: 12px;">\n            Cet email a été envoyé automatiquement par la plateforme Passerelle CAP.<br>\n            FEVES Guadeloupe et Saint-Martin\n          </p>\n        </div>\n      	{"event":"evs_acceptance","ficheId":"43841ebc-bc19-411d-b648-0979219dbff2","ficheRef":"FN-2025-10-001","evsOrgName":"AEP Ass enfants Parents","fevesEmails":["relations@feves.cap"]}	intercepted	\N	\N	2025-10-20 17:48:59.695576	\N	2025-10-20 17:48:59.695576
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

COPY public.fiche_navettes (id, ref, emitter_id, assigned_org_id, description, referent_data, family_detailed_data, children_data, workshop_propositions, family_consent, contract_signed, advance_payment_sent, contract_verified_by, contract_verified_at, activity_completed, activity_completed_by, activity_completed_at, field_check_completed, field_check_completed_by, field_check_completed_at, final_report_sent, remaining_payment_sent, final_verification_by, final_verification_at, total_amount, created_at, updated_at, selected_workshops, participants_count, cap_documents, state) FROM stdin;
43841ebc-bc19-411d-b648-0979219dbff2	FN-2025-10-001	5f69b418-8f0f-40bf-8ff1-6163fac22f90	b0cdde92-baae-436a-8ff7-00239b6da334	test	{"lastName":"Émetteur","firstName":"Marie","structure":"assistante sociales basse terre","phone":"0123456789","email":"emetteur@tas.cap","requestDate":"2025-10-20"}	{"code":"","email":"","mother":"test","father":"","tiers":"","lienAvecEnfants":"","autoriteParentale":"mere","situationFamiliale":"Célibataire ","situationSocioProfessionnelle":"salariée","adresse":"","telephonePortable":"0123456789","telephoneFixe":""}	[{"name":"enfant","dateNaissance":"2012-01-20","niveauScolaire":"seconde"}]	{"ATL2":"test","ATL11":"test"}	f	f	f	\N	\N	f	\N	\N	f	\N	\N	f	f	\N	\N	\N	2025-10-20 17:38:57.597365	2025-10-20 17:48:56.313	{"ATL1":false,"ATL3":false,"ATL4":false,"ATL2":true,"ATL8":false,"ATL6":false,"ATL9":false,"ATL7":false,"ATL5":true,"ATL10":false,"ATL11":true}	5	[]	ACCEPTED_EVS
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.migrations (id, name, checksum, metadata, executed_at) FROM stdin;
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
6e4bd194-7a0c-4aa9-82ac-0ea07d9089ab	suivi@feves.cap	$2b$12$B7MckttaQPiIKIXGsyIr.ekRzB9A/9koreOzBMWLqzbxXJO0d0a8a	Pierre	Suivi	SUIVI_PROJETS	\N	\N	\N	t	2025-10-20 16:58:24.027988	2025-10-20 16:58:24.027988
2a3b64ef-cff8-41ae-90be-902c792fcd0d	evs@association.cap	$2b$12$zuyguXSd.cwbxas/7wudquE.UFb9.0ckJloaYOTRWjMulF2jcrHqS	Jean	Martin	EVS_CS	\N	\N	\N	t	2025-10-20 16:59:10.21735	2025-10-20 16:59:10.21735
13794d89-5e47-48a0-95f1-6391918fb799	relations@feves.cap	$2b$12$/6ybesuiCNfFbRocJTTsJOCY6lMcp.N6P/DBYCokRBsv/CfzhsK7q	Sophie	Relations	RELATIONS_EVS	FEVES	0123456789	\N	t	2025-10-20 16:58:22.916489	2025-10-20 17:09:48.462
5f69b418-8f0f-40bf-8ff1-6163fac22f90	emetteur@tas.cap	$2b$12$PbrujcEGcVYTUj3E7S/c5uAzLqVDOrG0vXFc40zJU.AI7yNOZavM2	Marie	Émetteur	EMETTEUR	assistante sociales basse terre	0123456789	\N	t	2025-10-20 16:58:25.470574	2025-10-20 17:10:21.624
42690f8d-8286-4eff-8bb5-58af9827725b	enfantsparents971@gmail.com	$2b$12$.ljWMMaiYJ9ic/t1fHN.PubDdMyBShKNEAwZl7PC/Offp5N5QL69C	acqueline	LOUDAC J	EVS_CS	AEP Ass enfants Parents	0690 67 21 51	b0cdde92-baae-436a-8ff7-00239b6da334	t	2025-10-20 17:47:54.015353	2025-10-20 17:48:14.788
4e42f5a5-910f-4d4b-9815-f10c162f1fe0	Nadia.PLANTIER@cg971.fr	$2b$12$JM5lMwQDwvVhz.9YREeNBeOpwQfjNZNKCyHdyZt8OAdERU6FJ/T1y	Nadia	Plantier	CD	Conseil départemental	0123456789	\N	t	2025-10-20 17:51:10.081687	2025-10-20 17:51:10.081687
f41847ff-719d-420e-8fbc-da5f9b9b782e	veronique.gob@cg971.fr	$2b$12$5wA/4YwpJAsom8YbgFWPgu1z.yZLZdOTlYONG0sOFDMWzf7TrfXEC	Véronique	Gob	CD	Conseil départemental	0123456789	\N	t	2025-10-20 17:52:06.025018	2025-10-20 17:52:06.025018
\.


--
-- Data for Name: workshop_enrollments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workshop_enrollments (id, fiche_id, workshop_id, evs_id, participant_count, session_number, is_locked, min_capacity_notification_sent, contract_signed_by_evs, contract_signed_by_commune, contract_commune_pdf_url, contract_signed_at, activity_done, activity_completed_at, control_scheduled, control_validated_at, report_url, report_uploaded_at, report_uploaded_by, created_at, updated_at) FROM stdin;
37e812c6-64a5-4796-a68d-1c22a4321bc4	43841ebc-bc19-411d-b648-0979219dbff2	ATL2	b0cdde92-baae-436a-8ff7-00239b6da334	5	1	f	f	f	f	\N	\N	f	\N	f	\N	\N	\N	\N	2025-10-20 17:48:56.939007	2025-10-20 17:48:56.939007
45e1473d-b751-4711-a91b-8a2972c1a383	43841ebc-bc19-411d-b648-0979219dbff2	ATL5	b0cdde92-baae-436a-8ff7-00239b6da334	5	1	f	f	f	f	\N	\N	f	\N	f	\N	\N	\N	\N	2025-10-20 17:48:57.873868	2025-10-20 17:48:57.873868
c5f51215-deeb-4461-9d7e-f239fc31dc17	43841ebc-bc19-411d-b648-0979219dbff2	ATL11	b0cdde92-baae-436a-8ff7-00239b6da334	5	1	f	f	f	f	\N	\N	f	\N	f	\N	\N	\N	\N	2025-10-20 17:48:58.781985	2025-10-20 17:48:58.781985
\.


--
-- Data for Name: workshop_objectives; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workshop_objectives (id, code, name, description, "order", created_at) FROM stdin;
f1de090f-e76c-46df-995a-f357f0bd76b4	OBJ1	Compétences parentales	Renforcer les compétences parentales et la cohésion familiale	1	2025-10-20 16:00:14.911765
c76caca1-dca3-4688-a91f-2987f1ff5de5	OBJ2	Communication intergénérationnelle	Favoriser le dialogue et les échanges entre générations pour renforcer la compréhension mutuelle	2	2025-10-20 16:00:15.145708
1c9f8adc-d52a-45be-b390-d37db21a188e	OBJ3	Sport et dynamique familiale	Promouvoir la pratique d’activités physiques partagées pour renforcer les liens familiaux et le bien-être	3	2025-10-20 16:00:15.375298
\.


--
-- Data for Name: workshops; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workshops (id, objective_id, name, description, min_capacity, max_capacity) FROM stdin;
ATL1	f1de090f-e76c-46df-995a-f357f0bd76b4	Gestion du temps et organisation familiale	Aider les familles à organiser le temps entre les devoirs, les loisirs et les moments de détente.	8	10
ATL2	f1de090f-e76c-46df-995a-f357f0bd76b4	Communication entre parents et enfants	Renforcer la communication au sein de la famille par des outils et exercices pratiques.	8	10
ATL3	f1de090f-e76c-46df-995a-f357f0bd76b4	Méthodes d’apprentissage à la maison	Fournir aux parents des outils pratiques pour accompagner la réussite scolaire des enfants.	8	10
ATL4	f1de090f-e76c-46df-995a-f357f0bd76b4	Soutien émotionnel et motivation scolaire	Apprendre aux parents à soutenir la motivation et la confiance en soi de leurs enfants.	8	10
ATL5	c76caca1-dca3-4688-a91f-2987f1ff5de5	La parole des aînés : une richesse pour l’éducation	Créer un espace de dialogue intergénérationnel pour favoriser les échanges entre parents, enfants et grands-parents.	18	20
ATL6	c76caca1-dca3-4688-a91f-2987f1ff5de5	Mieux se comprendre pour mieux s’entraider	Améliorer la communication et la solidarité entre les générations.	7	9
ATL7	c76caca1-dca3-4688-a91f-2987f1ff5de5	Soutien scolaire et méthodes familiales	Aider les parents à mieux accompagner leurs enfants dans la scolarité.	7	9
ATL8	c76caca1-dca3-4688-a91f-2987f1ff5de5	Les émotions, le moteur de la réussite scolaire	Apprendre à gérer les émotions liées à l’école et au travail scolaire en famille.	8	10
ATL9	c76caca1-dca3-4688-a91f-2987f1ff5de5	Renforcer la motivation scolaire par le dialogue	Encourager les enfants à se projeter positivement dans leur parcours d’apprentissage.	18	20
ATL10	1c9f8adc-d52a-45be-b390-d37db21a188e	Pratique d’activité physique	Renforcer les liens familiaux par l’amélioration de la condition physique et la coopération.	8	10
ATL11	1c9f8adc-d52a-45be-b390-d37db21a188e	Atelier découverte Sport/Étude	Aider les familles à comprendre l’impact du sport sur l’équilibre personnel et scolaire.	28	30
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
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


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
-- Name: migrations migrations_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_unique UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (org_id);


--
-- Name: workshop_enrollments unique_fiche_workshop; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workshop_enrollments
    ADD CONSTRAINT unique_fiche_workshop UNIQUE (fiche_id, workshop_id);


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
-- Name: workshop_enrollments workshop_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workshop_enrollments
    ADD CONSTRAINT workshop_enrollments_pkey PRIMARY KEY (id);


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
-- Name: email_logs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_logs_created_at_idx ON public.email_logs USING btree (created_at);


--
-- Name: email_logs_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX email_logs_status_idx ON public.email_logs USING btree (status);


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
-- Name: migrations_executed_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX migrations_executed_at_idx ON public.migrations USING btree (executed_at);


--
-- Name: migrations_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX migrations_name_idx ON public.migrations USING btree (name);


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
-- Name: workshop_enrollments_evs_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workshop_enrollments_evs_idx ON public.workshop_enrollments USING btree (evs_id);


--
-- Name: workshop_enrollments_fiche_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workshop_enrollments_fiche_idx ON public.workshop_enrollments USING btree (fiche_id);


--
-- Name: workshop_enrollments_session_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workshop_enrollments_session_idx ON public.workshop_enrollments USING btree (workshop_id, evs_id, session_number);


--
-- Name: workshop_enrollments_workshop_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workshop_enrollments_workshop_idx ON public.workshop_enrollments USING btree (workshop_id);


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

