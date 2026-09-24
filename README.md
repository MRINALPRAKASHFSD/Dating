# Kindred

Kindred is a full-stack dating application designed around intentional connections, personality compatibility, and shared values. It combines a structured onboarding questionnaire with a multi-factor matching engine to introduce members based on genuine compatibility rather than superficial swiping.

## Core Features

- **Values-First Onboarding**: Guided multi-step onboarding covering member details, relationship intent, lifestyle hobbies, and personality questions.
- **Compatibility Engine**: Deterministic scoring model that evaluates candidates across:
  - **Shared Interests**: Weighted hobby overlap with intensity and category balance.
  - **Personality Traits**: Five-dimension alignment based on questionnaire responses.
  - **Intent & Preferences**: Hard filtering for age range, preferred genders, and distance radius.
- **Match Discovery**: Candidate cards featuring match percentage, trait breakdowns, and shared passions.
- **Mutual Connections**: Connection state management with mutual interest verification, conversation starter prompts, and unmatch controls.
- **Secure Persistence**: Supabase PostgreSQL backend with Row Level Security (RLS) enforcing complete member data isolation.




### Prerequisites

- Node.js 20+ installed
- npm or pnpm
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MRINALPRAKASHFSD/Dating.git
   cd Dating
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```bash
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`.

## Scripts

- `npm run dev`: Start Vite development server
- `npm run build`: Build production bundle for SSR and client
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint checks
- `npm run format`: Format code with Prettier

## Project Structure

```text
├── public/                 # Static assets and icons
├── src/
│   ├── components/
│   │   ├── kindred/       # Domain-specific UI (cards, onboarding, discovery)
│   │   └── ui/            # Reusable UI component library (Radix primitives)
│   ├── context/           # Auth and onboarding state providers
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # Supabase client and auth middleware
│   ├── lib/
│   │   └── matching/      # Compatibility scoring algorithm and fixtures
│   ├── routes/            # TanStack Router file-based routes
│   ├── router.tsx         # Router configuration
│   ├── server.ts          # Server entrypoint
│   ├── start.ts           # Client bootstrap
│   └── styles.css         # Tailwind v4 styles and tokens
└── supabase/
    └── migrations/        # Database schemas, tables, and RLS policies
```

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.
