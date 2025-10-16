# Passerelle CAP

## Overview

Passerelle CAP is a comprehensive full-stack platform for managing CAP (Contrat d'Accompagnement Personnalisé) family accompaniment files. The system facilitates workflow management between different stakeholders including administrative staff (ADMIN), project supervisors (SUIVI_PROJETS), issuers (EMETTEUR), EVS relations (RELATIONS_EVS), and EVS/CS organizations. The application implements a sophisticated state machine for tracking file progression from creation to closure, with robust role-based access control and audit logging throughout the process.

## User Preferences

Preferred communication style: Simple, everyday language.

**CRITICAL STYLING PREFERENCE**: 
- **NO TAILWIND CSS** - User explicitly wants all Tailwind removed from the project
- **CSS Modules only** - All components must use .module.css files for styling
- **Charte graphique colors** - Strict adherence to color palette (#3B4B61, #F5F6F7, #6A8B74, #D9A066, #8C4A4A)
- **NO YELLOW colors** - Absolutely no yellow in the design
- **Component structure** - All components as .jsx files with corresponding .module.css files

## Recent Changes (October 2025)

### Security Enhancement - Login Rate Limiting
- **Rate Limiter**: Protection against brute force attacks on login endpoint
  - **Implementation**: express-rate-limit middleware on `/api/auth/login`
  - **Limits**: Maximum 5 login attempts per IP address within 15-minute window
  - **Response**: Returns 429 status with French error message after limit exceeded
  - **Headers**: Standard RateLimit-* headers enabled for client-side tracking

### Legal Pages & Footer Implementation
- **Footer Component**: Minimalist footer with legal links only
  - **Content**: Only "Mentions Légales" and "Politique de Confidentialité" links (contact removed)
  - **Copyright**: Commented out in code (SELFIE ME) - can be reactivated if needed
  - **Styling**: CSS Modules (Footer.module.css) following strict charte graphique (#3B4B61 background, #F5F6F7 text)
  - **Layout**: Centered horizontal layout with responsive spacing
  - **Coverage**: Integrated across ALL pages (Home, Login, Dashboard, Fiches, Admin, Contact, Ateliers, FicheCreation, FicheDetail, Administration, Reports)
- **Legal Pages**: Markdown-based content system for easy updates without code changes
  - **Pages**: Mentions Légales and Politique de Confidentialité
  - **Rendering**: ReactMarkdown with remark-gfm plugin for rich formatting
  - **Access**: Public routes (no authentication required) via `/mentions-legales` and `/politique-confidentialite`
  - **Styling**: Shared LegalPage.module.css with professional typography and spacing
  - **Content Storage**: Markdown files in `/legal` directory, served via `/client/public/legal` for Vite compatibility

### Centralized Audit Log Interface
- **Admin Audit Tab**: New centralized audit log interface accessible only to ADMIN users
- **Features**: Full-text search, multi-criteria filtering (action type, entity type, user), pagination (20 items/page)
- **Backend**: GET `/api/admin/audit-logs` endpoint with role-based access control (ADMIN only)
- **Frontend**: `AdminAuditTab.jsx` component with `AdminAuditTab.module.css` (100% charte graphique compliant)
- **Filter Strategy**: Static reference lists (ACTION_LABELS, ENTITY_LABELS) ensure complete filtering capabilities
- **Display**: Comprehensive event details with actor information, timestamps, and expandable metadata JSON viewer
- **Smart Reference Display**: Fiche navette logs show formatted reference (FN-ANNEE-MOIS-CHIFFRE) instead of technical ID for better readability

## System Architecture

### Frontend Architecture
The client-side is built with React 18 using a modern component-based architecture. The application uses Wouter for lightweight routing instead of React Router, with TanStack Query for state management and data fetching. The UI is built with CSS Modules for component-specific styling, following the strict charte graphique color palette. Each component has a corresponding .module.css file for maintainable, scoped styling. The build system uses Vite for fast development and optimized production builds.

### Backend Architecture
The server implements a RESTful API using Express.js with middleware-based architecture. Authentication uses JWT tokens stored in HTTPOnly cookies for security. The system includes comprehensive RBAC (Role-Based Access Control) middleware that enforces permissions at the route level. File uploads are handled through Multer with local storage (designed to be easily adaptable to S3). The API includes comprehensive audit logging and state transition management.

### Database Design
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations and migrations. The schema implements complex relationships between entities including users, organizations, families, children, workshops, and fiche navettes. The database includes optimized indexes for performance and supports a sophisticated state machine for fiche workflow management.

### State Management
The application implements a finite state machine for fiche navette workflows with 16 distinct states from DRAFT to ARCHIVED. State transitions are role-restricted and fully audited. The frontend uses TanStack Query for server state management with optimistic updates and comprehensive caching strategies.

### Authentication & Authorization
Authentication is implemented using bcrypt for password hashing and JWT for session management. The system uses HTTPOnly cookies to prevent XSS attacks. Authorization follows a strict RBAC model with five distinct roles (ADMIN, SUIVI_PROJETS, EMETTEUR, RELATIONS_EVS, EVS_CS), each with specific permissions for different operations and data access patterns.

## External Dependencies

### Core Framework Dependencies
- **React 18** - Frontend framework with hooks and modern patterns
- **Express.js** - Backend API framework with middleware support
- **PostgreSQL** - Primary database for data persistence
- **Drizzle ORM** - Type-safe database operations and migrations

### UI & Styling
- **CSS Modules** - Component-scoped styling with .module.css files
- **Charte Graphique** - Strict adherence to color palette (#3B4B61, #F5F6F7, #6A8B74, #D9A066, #8C4A4A)
- **Lucide React** - Icon library for consistent iconography
- **Custom CSS Variables** - Global theming system without framework dependencies
- **ReactMarkdown** - Markdown rendering for legal documents with remark-gfm for GitHub-flavored markdown support

### Data & State Management
- **TanStack Query** - Server state management with caching and synchronization
- **Wouter** - Lightweight client-side routing

### Database & ORM
- **@neondatabase/serverless** - Serverless PostgreSQL connection pooling
- **Drizzle Kit** - Database migration and schema management tools

### Authentication & Security
- **bcrypt** - Password hashing for secure authentication
- **jsonwebtoken** - JWT token generation and verification
- **cookie-parser** - Cookie parsing middleware for session management

### File Handling & Validation
- **Multer** - Multipart form data handling for file uploads
- **Zod** - Runtime type validation and schema validation

### Development Tools
- **Vite** - Fast build tool and development server
- **TypeScript** - Type safety across the full stack
- **ESBuild** - Fast JavaScript bundler for production builds