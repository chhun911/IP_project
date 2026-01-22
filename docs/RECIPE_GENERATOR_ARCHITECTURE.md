# AI Recipe Generator - Architecture Documentation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Vue 3 (Composition API)                       │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              RecipeGenerator.vue                         │    │   │
│  │  │  • Mode toggle (meal name / ingredients)                 │    │   │
│  │  │  • Form submission                                       │    │   │
│  │  │  • Recipe display with ingredient images                 │    │   │
│  │  │  • Loading & error states                                │    │   │
│  │  │  • Unsplash attribution display                          │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP (fetch)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (NestJS)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     RecipeController                             │   │
│  │              POST /api/recipes/generate                          │   │
│  └──────────────────────────┬──────────────────────────────────────┘   │
│                             │                                           │
│  ┌──────────────────────────▼──────────────────────────────────────┐   │
│  │                     RecipeService                                │   │
│  │  1. Orchestrates recipe generation                               │   │
│  │  2. Combines OpenAI response + ingredient images                 │   │
│  └──────────┬───────────────────────────────────────┬──────────────┘   │
│             │                                       │                   │
│  ┌──────────▼──────────┐              ┌─────────────▼──────────────┐   │
│  │   OpenAIService     │              │  IngredientImageService    │   │
│  │                     │              │                            │   │
│  │ • Build prompts     │              │ • Normalize ingredient     │   │
│  │ • Call GPT-4o-mini  │              │   names                    │   │
│  │ • Validate JSON     │              │ • Check cache first        │   │
│  │ • Return recipe     │              │ • Fetch from Unsplash      │   │
│  │   structure         │              │ • Store in cache           │   │
│  └──────────┬──────────┘              │ • Rate limiting            │   │
│             │                         └─────────────┬──────────────┘   │
│             │                                       │                   │
└─────────────┼───────────────────────────────────────┼───────────────────┘
              │                                       │
              ▼                                       ▼
┌─────────────────────┐                 ┌───────────────────────────────┐
│     OpenAI API      │                 │        Unsplash API           │
│   (gpt-4o-mini)     │                 │    (Image Search)             │
└─────────────────────┘                 └───────────────────────────────┘
                                                      │
                                                      │ Cache lookup/store
                                                      ▼
                                        ┌───────────────────────────────┐
                                        │         PostgreSQL            │
                                        │  ┌─────────────────────────┐  │
                                        │  │   ingredient_images     │  │
                                        │  │   table                 │  │
                                        │  └─────────────────────────┘  │
                                        └───────────────────────────────┘
```

## Data Flow

### Request Flow
1. User enters meal name OR list of ingredients
2. Vue component sends POST to `/api/recipes/generate`
3. RecipeController validates DTO
4. RecipeService orchestrates:
   - Calls OpenAIService → generates recipe JSON
   - Calls IngredientImageService → resolves images for each ingredient
5. Response returned with complete recipe + ingredient images

### Caching Flow
```
Ingredient Name → Normalize → Check PostgreSQL Cache
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                Cache Hit                     Cache Miss
                     │                             │
              Return cached                 Call Unsplash API
              image + attribution                  │
                                           Store in cache
                                                   │
                                           Return new image
```

## NestJS Project Structure

```
api-gateway/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── recipe/
│       ├── recipe.module.ts
│       ├── recipe.controller.ts
│       ├── recipe.service.ts
│       ├── dto/
│       │   └── recipe.dto.ts
│       ├── interfaces/
│       │   └── ingredient-image.interface.ts
│       └── services/
│           ├── openai.service.ts
│           ├── ingredient-image.service.ts
│           └── database.service.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Database Schema

### `ingredient_images` Table

| Column                     | Type         | Constraints          | Description                       |
|---------------------------|--------------|---------------------|-----------------------------------|
| id                        | SERIAL       | PRIMARY KEY         | Auto-increment ID                 |
| ingredient_name_normalized| VARCHAR(255) | UNIQUE, NOT NULL    | Normalized ingredient name        |
| image_url                 | TEXT         | NOT NULL            | Unsplash image URL               |
| attribution_text          | VARCHAR(500) | NOT NULL            | "Photo by X on Unsplash"         |
| attribution_link          | TEXT         | NOT NULL            | Photographer profile URL          |
| source                    | VARCHAR(50)  | NOT NULL, DEFAULT   | 'unsplash' or 'placeholder'      |
| created_at                | TIMESTAMP    | DEFAULT NOW()       | Record creation time              |
| updated_at                | TIMESTAMP    | DEFAULT NOW()       | Last update time                  |

**Index:** `idx_ingredient_name` on `ingredient_name_normalized`

## API Endpoints

### POST /api/recipes/generate

**Request:**
```json
{
  "mode": "mealName" | "fromIngredients",
  "mealName": "Chicken Parmesan",           // Required if mode = mealName
  "ingredients": ["chicken", "garlic"]       // Required if mode = fromIngredients
}
```

**Response:**
```json
{
  "title": "Crispy Chicken Parmesan",
  "servings": 4,
  "estimatedTimeMinutes": 45,
  "ingredients": [
    {
      "name": "chicken breast",
      "amount": "4",
      "unit": "pieces",
      "imageUrl": "https://images.unsplash.com/...",
      "imageSource": "unsplash",
      "attribution": {
        "text": "Photo by John Doe on Unsplash",
        "link": "https://unsplash.com/@johndoe?utm_source=aicookbook&utm_medium=referral"
      }
    }
  ],
  "steps": [
    "Preheat oven to 400°F (200°C).",
    "Pound chicken breasts to even thickness..."
  ],
  "tips": [
    "Use panko breadcrumbs for extra crispiness"
  ],
  "warnings": [
    "Cook chicken to internal temperature of 165°F (74°C)"
  ]
}
```

## Environment Variables

| Variable               | Description                          | Required |
|-----------------------|--------------------------------------|----------|
| `OPENAI_API_KEY`      | OpenAI API key for recipe generation | Yes      |
| `OPENAI_MODEL`        | OpenAI model (default: gpt-4o-mini)  | No       |
| `UNSPLASH_ACCESS_KEY` | Unsplash API access key              | Yes      |
| `POSTGRES_HOST`       | PostgreSQL host                      | Yes      |
| `POSTGRES_PORT`       | PostgreSQL port (default: 5432)      | No       |
| `POSTGRES_DB`         | Database name                        | Yes      |
| `POSTGRES_USER`       | Database user                        | Yes      |
| `POSTGRES_PASSWORD`   | Database password                    | Yes      |
| `PORT`                | Server port (default: 3000)          | No       |
| `NODE_ENV`            | Environment (development/production) | No       |

## Rate Limiting & Cost Control

### OpenAI
- **Model:** `gpt-4o-mini` (cost-effective, ~$0.15/1M input tokens)
- **Max tokens:** 2000 per request
- **Rate limiting:** Implement request queuing if needed
- **Cost estimate:** ~$0.01-0.02 per recipe generation

### Unsplash
- **Free tier:** 50 requests/hour
- **Implementation:**
  - In-memory rate limit counter (resets hourly)
  - Cache-first strategy (PostgreSQL)
  - Fallback to placeholder images when rate limited
- **Attribution required:** Always display photographer name + link

### Caching Strategy
1. **Ingredient name normalization:**
   - Lowercase, trim whitespace
   - Remove descriptors: "fresh", "chopped", "organic", etc.
   - Example: "Fresh Organic Chopped Tomatoes" → "tomatoes"

2. **Cache benefits:**
   - Reduces Unsplash API calls by 80-90%
   - Common ingredients (chicken, garlic, onion) cached quickly
   - Persistent storage survives restarts

3. **Cache invalidation:**
   - No automatic invalidation (images don't change)
   - Manual: DELETE from ingredient_images WHERE ...

## Security Considerations

1. **API Keys:** Never exposed to frontend; only used server-side
2. **Input validation:** DTOs validated with class-validator
3. **SQL injection:** Parameterized queries via pg library
4. **CORS:** Configure appropriately for production
5. **Food safety:** OpenAI prompted to include safety warnings

## Running the Application

### Development (Docker)
```bash
# Set environment variables
cp api-gateway/.env.example api-gateway/.env
# Edit .env with your API keys

# Start all services
docker-compose up --build
```

### Development (Local)
```bash
# Terminal 1: PostgreSQL
docker run -d --name postgres -p 5432:5432 \
  -e POSTGRES_DB=aicookbook \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  postgres:16-alpine

# Terminal 2: API Gateway
cd api-gateway
npm install
npm run dev

# Terminal 3: Frontend
npm install
npm run dev
```

### URLs
- Frontend: http://localhost:5173
- API: http://localhost:3001
- Recipe endpoint: POST http://localhost:3001/api/recipes/generate
