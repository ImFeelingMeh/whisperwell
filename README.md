# WhisperWell

A calm, anonymous peer-support app where users drop a whisper into the well and receive three thoughtful responses from the community.

## Features

- **Anonymous Access**: Continue anonymously with no username or profile
- **Reciprocity Gate**: Respond to 3 whispers before posting your own
- **Whisper Metadata**: Optional category, emotion, and vent-mode tags
- **Voices from the Well**: Scrollable whisper feed with quick respond/report actions
- **Daily Mood Check-in**: Gentle `good`, `okay`, `struggling` check-in
- **Safety Layer**: Harmful content blocking, crisis guidance prompt, and reporting
- **Moderation Queue**: Auto-flag + user-report queue for review
- **Response Reactions**: `helpful`, `relatable`, `encouraging` reactions with no like counts

## Architecture

### Database Schema

#### Tables

1. **profiles**
   - Stores minimal user profile data
   - Auto-created when user signs up via trigger
   - RLS enabled: users can view all profiles, update only their own

2. **questions**
   - Stores all questions with their status (open, claimed, complete)
   - Tracks who asked and when
   - RLS enabled: users can view open questions and their own questions

3. **answers**
   - Stores anonymous answers to questions
   - Responder IDs stored for moderation only
   - RLS enabled: no direct access, only via secure RPCs

4. **reports**
   - Optional moderation queue
   - RLS enabled: users can insert reports

### Server-Side Logic (RPCs)

All data mutations are handled through secure Postgres functions:

#### `ask_question(p_text TEXT)`
- Validates user doesn't have an active question
- Applies profanity filter
- Inserts new question with status='open'
- Returns question ID or raises error

#### `get_and_claim_random()`
- Resets stale claims (>10 minutes old)
- Finds random open question (not from caller, not previously answered by caller)
- Uses `FOR UPDATE SKIP LOCKED` for concurrency safety
- Claims question atomically
- Returns question ID and text

#### `submit_answer(p_qid UUID, p_text TEXT)`
- Verifies caller is allowed to answer
- Applies profanity filter
- Inserts answer
- Counts total answers
- If 3 answers reached, marks question as complete
- Otherwise unclaims question for next answerer

#### `get_final_chain(p_qid UUID)`
- Verifies caller is the original asker
- Returns three answers in order of creation
- Only accessible when question status is complete

### Security (RLS)

- **profiles**: Public read, users can only update their own
- **questions**: Users can view open questions and their own questions
- **answers**: No direct access; answers only retrievable via `get_final_chain` RPC
- **reports**: Users can insert reports

All mutations are forced through secure RPC functions with `SECURITY DEFINER` to ensure business rules are enforced server-side.

### Real-time Updates

The `questions` table is published to Supabase Realtime. The frontend subscribes to changes for the current user's questions, enabling instant notification when a question becomes complete.

### Claim Timeout Mechanism

The `get_and_claim_random()` function automatically resets claims older than 10 minutes, ensuring questions don't get stuck if an answerer abandons their session.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Postgres, Auth, Realtime)
- **UI Components**: shadcn/ui
- **Routing**: React Router

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (Supabase URL and keys)
4. Run migrations in Supabase dashboard
5. Start dev server: `npm run dev`

## Design Philosophy

WhisperWell is designed to feel like a small, kind secret. The experience prioritizes:
- Reducing friction
- Protecting privacy (anonymous answers)
- Creating delight in the moment when the 3-line chain appears
- Encouraging patience and kindness through thoughtful microcopy

The app uses warm colors (cream background, muted lavender), rounded UI elements, and calm micro-animations (well ripple, staggered answer reveal) to create an intimate, cozy atmosphere.
