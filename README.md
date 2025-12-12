# DokiChat - Personal AI Romantic Companions

A personal web application for chatting with romantic AI characters who remember and care about you. Built with Next.js, TypeScript, Prisma, and TailwindCSS.

## Features

- 🎨 **Create Your Own Characters**: Build custom AI personalities from scratch with full control
- ✏️ **Edit Everything**: All character traits (persona, speaking style, boundaries) are editable
- 📋 **Clone & Customize**: Duplicate existing characters as templates for new ones
- 💭 **Memory System**: Two-layer memory (short-term conversation history + long-term important memories)
- 📱 **Phone Check Feature**: Interactive "jealous partner checking your phone" roleplay
- 💕 **Relationship Tracking**: Customize relationship status and context per character
- 🎨 **Beautiful UI**: Glassmorphism design with smooth animations and romantic aesthetics
- ⚙️ **LLM Agnostic**: Works with any OpenAI-compatible API (OpenAI, Qwen, DeepSeek, etc.)
- 📦 **Example Characters**: Comes with 5 diverse sample characters to inspire you

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Prisma + SQLite (easily switchable to PostgreSQL)
- **LLM**: Abstracted provider interface (OpenAI-compatible)
- **Language**: TypeScript

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure your LLM provider:

```bash
cp .env.example .env
```

Edit `.env` and set your LLM provider credentials:

```env
# For OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-api-key
LLM_MODEL=gpt-4

# For Qwen (example)
# LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
# LLM_API_KEY=sk-your-qwen-key
# LLM_MODEL=qwen-plus

# For DeepSeek (example)
# LLM_BASE_URL=https://api.deepseek.com/v1
# LLM_API_KEY=sk-your-deepseek-key
# LLM_MODEL=deepseek-chat
```

### 3. Initialize Database

```bash
# Push the schema to create the database
npm run db:push

# Seed with sample characters
npm run db:seed
```

This will create:
- 5 diverse AI characters (Yuki, Akira, Luna, Kai, Mira)
- A default user profile
- Default relationship configurations

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
doki/
├── app/
│   ├── api/              # API routes
│   │   ├── characters/   # Character endpoints
│   │   ├── chat/         # Main chat endpoint
│   │   ├── memories/     # Memory CRUD
│   │   ├── messages/     # Message history
│   │   ├── relationship/ # Relationship configs
│   │   └── user-profile/ # User profile
│   ├── characters/       # Character list & profile pages
│   ├── chat/             # Chat interface
│   ├── settings/         # Settings page
│   └── layout.tsx        # Root layout
├── components/           # Reusable React components
├── lib/
│   ├── llm/              # LLM provider abstraction
│   └── prompt/           # Prompt builder
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
└── public/               # Static assets
```

## Usage Guide

### Chat with Characters

1. Navigate to the **Characters** page
2. Click on a character card to view their profile
3. Click **Start Chat** to begin a conversation
4. Type your message and press Send

### Manage Characters

**Create New Character:**
1. Click **✨ Create New Character** on the Characters page
2. Fill in all fields:
   - Name, gender, avatar
   - Short description (shown on cards)
   - Persona (detailed personality, background, how they relate to you)
   - Speaking style (emojis, tone, pet names)
   - Boundaries (topics/behaviors to avoid)
   - Tags (comma-separated)
3. Click **Create Character**

**Edit Existing Character:**
1. Go to the character's profile page
2. Click **✏️ Edit**
3. Modify any fields
4. Click **Save Changes**

**Duplicate Character:**
1. On a character's profile, click **📋 Duplicate**
2. Modify the copy as desired
3. Create a new character based on the template

**Delete Character:**
- Click **🗑️ Delete** on the character profile
- Confirm deletion (this also deletes all messages and memories)

> [!NOTE]
> The 5 sample characters from seed data are fully editable! They're just starting templates to inspire you. Feel free to customize them or create entirely new personalities.

### Phone Check Feature

1. In the chat, click **📱 Phone Check**
2. Fill out the form:
   - Which app they're checking
   - What they see (messages, notifications, etc.)
   - Whether it's suspicious
3. The character will react in-character based on their personality

### Memory Management

**View Memories:**
- Click **💭 Memories** in the chat header

**Create Memory:**
- Click **💾 Save** under any assistant message, OR
- Click the **💾** button in the input area for custom memories

**Delete Memory:**
- Open the Memory Viewer and click 🗑️ next to any memory

### Customize Settings

Go to **Settings** to:
- Edit your user profile (name, nickname, personality, likes, dislikes)
- Configure relationships per character (status, start date, special notes)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/characters` | GET, POST | List all characters / Create new character |
| `/api/characters/:id` | GET, PUT, DELETE | Get / Update / Delete character |
| `/api/user-profile` | GET, PUT | Get/update user profile |
| `/api/relationship` | GET, PUT | Get/update relationship configs |
| `/api/messages` | GET | Get message history for a character |
| `/api/memories` | GET, POST, DELETE | CRUD operations for memories |
| `/api/chat` | POST | Send message and get AI response |

## Development Features

### Debug Logging

In development mode (`NODE_ENV=development`), the app logs:
- Full prompts sent to the LLM
- Memories injected into each conversation
- Scene states (e.g., phone check)

Check your console/terminal for these logs.

### Database Management

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio

# Reset database
rm prisma/dev.db
npm run db:push
npm run db:seed
```

## Customization

### Add New Characters

Edit `prisma/seed.ts` and add a new character object with:
- name, gender, avatarUrl
- shortDescription, persona, speakingStyle
- boundaries, tags

Then re-run the seed:

```bash
npm run db:seed
```

### Change LLM Provider

Simply update your `.env` file with the new provider's base URL, API key, and model name. The app works with any OpenAI-compatible API.

### Add New Memory Types

Edit the `MEMORY_TYPES` constant in:
- `components/CreateMemoryModal.tsx`
- `components/MemoryViewer.tsx`

### Extend Scene States

The `sceneState` field on messages is JSON, so you can add new scene types beyond `phone_check`:
- `anniversary` - celebrating a special date
- `date` - going on a virtual date
- `fight` - resolving a conflict
- etc.

## Architecture Highlights

### LLM Abstraction

The app uses a provider interface (`LLMProvider`) that separates the LLM implementation from the business logic. This makes it easy to swap providers or add new ones.

```typescript
interface LLMProvider {
  generateResponse(messages: LLMMessage[]): Promise<string>
}
```

### Prompt Building

The `buildChatPrompt` function constructs the full context for each message:
1. System message with character persona
2. User profile and relationship context
3. Long-term memories (top 10 by importance)
4. Recent conversation history (last 20 messages)
5. Optional scene state (phone check, etc.)

### Memory Retrieval

Simple strategy for MVP:
- Load top 10 memories by `importanceScore` + `createdAt`
- Can be enhanced with semantic search (embeddings) later

## Production Deployment

### Environment Variables

Make sure to set all required environment variables in your production environment.

### Database

For production, switch from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Set `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

3. Run migrations:
```bash
npx prisma migrate dev
npx prisma db seed
```

### Build

```bash
npm run build
npm start
```

## License

This is a personal project for individual use. Feel free to customize and modify as needed.

## Credits

Created with 💕 by an AI assistant for personal romantic AI companions.
