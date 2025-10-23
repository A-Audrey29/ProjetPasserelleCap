# Passerelle CAP

## Overview

Passerelle CAP is a full-stack platform designed for managing CAP (Contrat d'Accompagnement Personnalisé) family accompaniment files. Its primary purpose is to streamline workflow management among administrative staff, project supervisors, issuers, EVS relations, and EVS/CS organizations. The system features a sophisticated state machine for tracking file progression, robust role-based access control, and comprehensive audit logging. The project aims to provide an efficient and secure solution for managing personalized accompaniment contracts.

## User Preferences

Preferred communication style: Simple, everyday language.

**CRITICAL STYLING PREFERENCE**:
- **NO TAILWIND CSS** - User explicitly wants all Tailwind removed from the project
- **CSS Modules only** - All components must use .module.css files for styling
- **Charte graphique colors** - Strict adherence to color palette (#3B4B61, #F5F6F7, #6A8B74, #D9A066, #8C4A4A)
- **NO YELLOW colors** - Absolutely no yellow in the design
- **Component structure** - All components as .jsx files with corresponding .module.css files

## System Architecture

### UI/UX Decisions
The frontend adheres to a strict "charte graphique" (graphic charter) with a specific color palette (#3B4B61, #F5F6F7, #6A8B74, #D9A066, #8C4A4A), explicitly excluding yellow. Styling is exclusively managed via CSS Modules, ensuring component-scoped styles. All components are structured as `.jsx` files with corresponding `.module.css` files. Legal pages (Mentions Légales, Politique de Confidentialité) are implemented using Markdown for easy content updates and are accessible via public routes.

### Technical Implementations
The client-side is built with React 18, utilizing Wouter for lightweight routing and TanStack Query for data fetching and state management. The backend is a RESTful API built with Express.js, featuring middleware for authentication (JWT in HTTPOnly cookies), authorization (RBAC), and audit logging. File uploads use Multer with UUID-based filenames and magic number validation for security. Environment configuration uses `dotenv-flow` for secure multi-environment deployments (development and production).

### Feature Specifications
The core functionality revolves around a finite state machine managing 16 distinct states for fiche navette workflows, with role-restricted and audited transitions. A centralized audit log interface, accessible only to ADMIN users, provides full-text search, multi-criteria filtering, and pagination. Security enhancements include Helmet middleware for HTTP security headers, robust CORS configuration, login rate limiting, environment-aware error handling, structured error logging, and a demo account guard system to prevent write operations in production.

### System Design Choices
PostgreSQL is the primary database, managed with Drizzle ORM for type-safe operations and migrations. The system employs a robust RBAC model with five roles (ADMIN, SUIVI_PROJETS, EMETTEUR, RELATIONS_EVS, EVS_CS) for granular permission control. Frontend uses Vite for fast development and optimized builds, while the backend utilizes TypeScript for type safety across the stack.

## External Dependencies

- **React 18**: Frontend framework.
- **Express.js**: Backend API framework.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Type-safe database operations.
- **TanStack Query**: Server state management, caching, and synchronization.
- **Wouter**: Lightweight client-side routing.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT token generation and verification.
- **cookie-parser**: Cookie parsing middleware.
- **Multer**: Multipart form data handling for file uploads.
- **Zod**: Runtime type and schema validation.
- **Lucide React**: Icon library.
- **ReactMarkdown** with **remark-gfm**: Markdown rendering for legal documents.
- **Helmet**: HTTP security headers middleware.
- **express-rate-limit**: Login rate limiting.
- **file-type**: File magic number validation.
- **@neondatabase/serverless**: Serverless PostgreSQL connection pooling.
- **dotenv-flow**: Environment variable management.

## Environment Configuration & Migration Strategy

### Overview
The project implements a robust multi-environment configuration system using **dotenv-flow** to facilitate migration from Replit to o2switch while maintaining security best practices.

### Configuration Files

**`.env.example`** (versioned in Git):
- Complete documentation of all environment variables with placeholder values
- Template for creating environment-specific files
- Safe to version control (contains no real secrets)

**`.env.development`** (ignored by Git):
- Configuration for Replit/local development
- Neon PostgreSQL development branch
- Email interception enabled (logs only, no sending)
- Demo accounts can perform all actions (`ALLOW_DEMO_ACTIONS=true`)
- Generated via: `node scripts/generate-env-files.js development`

**`.env.production`** (ignored by Git):
- Configuration for o2switch production deployment
- Neon PostgreSQL main branch
- Real SMTP sending via Brevo
- Demo accounts read-only (`ALLOW_DEMO_ACTIONS=false`)
- Generated via: `node scripts/generate-env-files.js production`

### Environment Variable Resolution Order

**Backend (Node.js/Express)**:
1. Replit Secrets (highest priority in Replit environment)
2. System environment variables (process.env)
3. `.env.production` (if NODE_ENV=production)
4. `.env.development` (if NODE_ENV=development)
5. `.env.local` (local overrides, any environment)
6. `.env` (base configuration, all environments)

**Frontend (Vite)**:
- Only variables prefixed with `VITE_*` are accessible in client code
- Injected at build time, NOT runtime
- No backend secrets can leak to frontend bundle
- **Current Status**: No environment variables used in client code (verified October 23, 2025)

### Key Environment Variables

**Critical Security Variables**:
- `DATABASE_URL`: PostgreSQL connection string (Neon branch)
- `JWT_SECRET`: Token signing key (min 32 chars, generate with `openssl rand -base64 32`)
- `COOKIE_SECRET`: Session cookie signing key
- `CORS_ORIGIN`: Allowed domains for cross-origin requests

**Email Configuration**:
- `EMAIL_INTERCEPT`: `true` (dev) / `false` (prod)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`: SMTP settings (Brevo in production)

**Demo Account Protection**:
- `ALLOW_DEMO_ACTIONS`: Controls whether demo accounts (@demo.passerelle.cap) can perform write operations
- `VITE_ENABLE_DEMO_ACCOUNTS`: Controls frontend display of demo account features

### Demo Account Guard System

**Implementation**: `server/middleware/demoAccountGuard.ts`

**Functionality**:
- Identifies demo accounts by email pattern (`@demo.passerelle.cap`, `@demo.cap`, `@demo.test`)
- In development (`ALLOW_DEMO_ACTIONS=true`): All actions permitted
- In production (`ALLOW_DEMO_ACTIONS=false`): Demo accounts become read-only
- Blocks critical operations: deletion, state changes, data modifications

**Usage Example**:
```typescript
import { blockDemoAccountActions } from './middleware/demoAccountGuard';
app.delete('/api/fiches/:id', requireAuth, blockDemoAccountActions('suppression de fiche'), deleteFiche);
```

### Migration Workflow to o2switch

1. **Generate Production Config**:
   ```bash
   node scripts/generate-env-files.js production
   ```

2. **Configure Secrets**:
   - Edit `.env.production` with real values:
     - Real DATABASE_URL (Neon main branch)
     - Strong JWT_SECRET and COOKIE_SECRET (generated with openssl)
     - Brevo SMTP credentials
     - Production domain in CORS_ORIGIN

3. **Deploy to o2switch**:
   - Upload codebase (excluding .env files via .gitignore)
   - Copy `.env.production` to server
   - Set `NODE_ENV=production` on server
   - Restart application

4. **Verification**:
   - Check email sending works (EMAIL_INTERCEPT=false)
   - Verify demo accounts are read-only
   - Test CORS with production domain
   - Confirm database connection to main branch

### Security Guarantees

✅ **Git Protection**: `.gitignore` excludes all `.env*` files except `.env.example`
✅ **Backend Secrets Isolation**: No sensitive variables accessible in frontend code
✅ **Frontend Bundle Safety**: Only `VITE_*` variables can be bundled (none currently used)
✅ **Demo Account Safety**: Production demo accounts cannot modify data
✅ **CORS Enforcement**: Production requires explicit domain whitelist

### Tools & Scripts

**`scripts/generate-env-files.js`**:
- Generates `.env.development` or `.env.production` from templates
- Includes comprehensive inline documentation
- Prevents accidental file overwrites
- Full documentation in `scripts/README.md`