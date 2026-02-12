# Chat Integration with DeepSeek AI

## Overview

The chat backend has been integrated with the DeepSeek AI API to provide intelligent cooking assistance and recipe recommendations.

## Architecture

### Components

1. **DeepSeekService** (`backend/src/chat/services/deepseek.service.ts`)
   - Handles communication with the DeepSeek AI API
   - Manages conversation context
   - Provides specialized system prompts for cooking assistance

2. **ChatService** (`backend/src/chat/chat.service.ts`)
   - Processes user chat messages
   - Integrates with DeepSeekService
   - Falls back to mock recipes if AI service fails

3. **ChatController** (`backend/src/chat/chat.controller.ts`)
   - Exposes `/api/chat` POST endpoint
   - Handles incoming chat requests

## Configuration

The chat service uses the same environment variables as the recipe generator:

```env
AI_API_KEY=your_deepseek_api_key_here
AI_MODEL=deepseek-chat
AI_API_BASE_URL=https://api.deepseek.com
```

## API Endpoint

### POST `/api/chat`

Send a message to the AI cooking assistant.

**Request Body:**
```json
{
  "message": "How do I make pasta carbonara?",
  "userId": "user-123" // optional
}
```

**Response:**
```json
{
  "success": true,
  "response": "To make pasta carbonara, you'll need...",
  "recipe": null
}
```

## Features

The AI cooking assistant can:
- Answer cooking questions and provide culinary advice
- Suggest recipes based on available ingredients
- Provide detailed recipe instructions
- Offer food safety tips and best practices
- Suggest ingredient substitutions
- Help with meal planning

## Error Handling

- If the AI API key is not configured, returns a 400 error
- If the AI service is unavailable, falls back to simple recipe matching
- Validates all inputs using class-validator

## System Prompt

The DeepSeek service uses a specialized system prompt that:
- Defines the assistant as an expert cooking advisor
- Sets guidelines for responses (clear, practical, friendly)
- Ensures food safety information is included when relevant
- Encourages creative alternatives and substitutions

## Testing

You can test the chat endpoint using curl:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What can I make with eggs and tomatoes?"}'
```

## Future Enhancements

- [ ] Conversation history persistence
- [ ] User preference learning
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Image-based recipe recognition
