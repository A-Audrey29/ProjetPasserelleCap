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