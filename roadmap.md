# Kindred

## Phase 1 — Onboarding (complete)
- [x] Shared onboarding data model and reusable controls
- [x] Account creation and basic-details routes
- [x] Hobbies, quiz, and profile-preview experiences
- [x] Validation, mobile, desktop, and build health

## Phase 2 — Accounts and persistence (complete)
- [x] Database: profiles, hobbies, chosen hobbies, personality questions/options/answers
- [x] Access rules so members only reach their own data
- [x] Real sign-up, log in, log out, password reset
- [x] Onboarding saved step by step, resumes after closing the browser
- [x] Profile preview reads saved data; "Welcome to Kindred" home screen

## Phase 3 — Compatibility engine (complete)
- [x] Matching preferences record (age range, distance, preferred genders, relationship intent)
- [x] Deterministic, explainable scoring: interests (with intensity + category balance), personality, intent, location
- [x] Hard eligibility filters before scoring; ranked candidates with plain-language reasons
- [x] Unit tests for all scoring rules
- [x] Matching preferences onboarding step (intent, age range, preferred genders, distance)
- [x] Match discovery screen (Phase 2, no messaging yet)

## Phase 4 — Connections (complete)
- [x] Mutual-match table and server-side match creation
- [x] Interest sent / withdraw state
- [x] "You found each other." confirmation and connection detail with conversation starter
- [x] Connections tab, unmatch with confirmation

## Phase 5 — Private Messaging & Deep Talk (complete)
- [x] Database migration: conversations, messages, deep_talk_prompts, conversation_prompt_usage
- [x] Row Level Security policies for match participants
- [x] Server-side messaging RPCs with verified sender identity
- [x] Deterministic Deep Talk prompt selection with interest weighting and repeat prevention
- [x] Realtime Postgres subscription for instant message delivery
- [x] Optimistic message state, retry handling, and cursor pagination
- [x] Chat interface with calm editorial styling and responsive composer
- [x] Messages overview route and conversation navigation

## Later
- Push notifications, photo messaging, audio prompts
