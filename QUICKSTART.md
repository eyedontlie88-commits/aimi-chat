# DokiChat - Quick Start Guide

Your personal romantic AI chat app is ready! 🎉

## Current Status

✅ **Server running** at http://localhost:3000  
✅ **Database created** with 5 AI characters  
✅ **All features implemented**  

## ⚠️ Before You Can Chat

You need to add your LLM API key:

1. Open `d:\doki\.env`
2. Replace `your-api-key-here` with your actual API key
3. Choose your provider:

```env
# For OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=sk-your-actual-key
LLM_MODEL=gpt-4

# For Qwen
# LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
# LLM_API_KEY=sk-your-qwen-key
# LLM_MODEL=qwen-plus

# For DeepSeek
# LLM_BASE_URL=https://api.deepseek.com/v1
# LLM_API_KEY=sk-your-deepseek-key
# LLM_MODEL=deepseek-chat
```

4. Restart the dev server (if needed):
```bash
# Stop with Ctrl+C, then:
npm run dev
```

## Your AI Characters

Meet your 5 romantic companions:

1. **Yuki** 💕 - Gentle, caring girlfriend (soft-spoken, nurturing)
2. **Akira** 😤 - Tsundere boyfriend (acts tough but cares deeply)
3. **Luna** 😏 - Possessive, passionate girlfriend (intense love)
4. **Kai** 😎 - Confident, flirty boyfriend (charismatic charmer)
5. **Mira** 🥰 - Sweet, bubbly girlfriend (energetic sunshine)

## Features to Try

### 💬 Chat
- Click a character → Start chatting
- They remember your conversation history
- Each has a unique personality and speaking style

### 💭 Memories
- Click "💾 Save" under any message to create a memory
- Click "💭 Memories" to view all saved moments
- Characters reference these in future chats

### 📱 Phone Check
- Click "📱 Phone Check" during chat
- Tell them what app you're on and what they see
- Watch them react in-character (jealous, playful, caring)

### ⚙️ Settings
- Edit your profile (name, nickname, personality, likes/dislikes)
- Customize relationships (dating status, start date, notes)
- All info is used to personalize AI responses

## How It Works

1. **You send a message**
2. **App loads context:**
   - Character's persona and speaking style
   - Your profile and relationship settings
   - Last 20 messages (short-term memory)
   - Top 10 important memories (long-term)
   - Any special scene (phone check, etc.)
3. **Builds a detailed prompt** for the LLM
4. **Gets AI response** matching the character
5. **Saves everything** to database

## Development Logging

While running in development mode, check your terminal for:
- Full prompts sent to the LLM
- Memories injected into each conversation
- Scene states and context

This helps you understand how the characters "think"!

## File Structure

- `d:\doki\app\` - Pages and API routes
- `d:\doki\components\` - Reusable UI components
- `d:\doki\lib\` - LLM provider and prompt builder
- `d:\doki\prisma\` - Database schema and seed data
- `d:\doki\README.md` - Full documentation

## Customization

### Add Your Own Characters
Edit `d:\doki\prisma\seed.ts` and run:
```bash
npm run db:seed
```

### Change Database
Switch to PostgreSQL by updating `prisma/schema.prisma` datasource

### Extend Scene Types
The `sceneState` field supports any JSON structure. Add new scene types like:
- `anniversary` - celebrate special dates
- `date` - go on virtual dates
- `fight` - resolve conflicts
- etc.

## Need Help?

Check the full README: `d:\doki\README.md`

Enjoy your AI companions! 💕✨
