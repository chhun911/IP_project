# AI CookBook - Monorepo

A full-stack application with Vue.js frontend and Node.js microservices backend.

## Project Structure

```
├── src/                    # Vue.js frontend
│   ├── components/        # Vue components
│   ├── assets/           # Static assets
│   ├── App.vue           # Root component
│   ├── main.ts           # Frontend entry point
│   └── style.css         # Global styles
├── api-gateway/          # API Gateway service
│   ├── src/
│   │   └── index.ts      # Express server
│   └── package.json
└── order-worker/         # Order processing worker
    ├── src/
    │   └── index.ts      # Worker logic
    └── package.json
```

## Services

### Frontend (Vue.js + TypeScript + Vite)

Located in root directory.

**Setup & Run:**

```bash
npm install
npm run dev
```

Runs on: `http://localhost:5173`

### API Gateway (Express.js + TypeScript)

RESTful API gateway for routing requests.

**Setup & Run:**

```bash
cd api-gateway
npm install
npm run dev
```

Runs on: `http://localhost:3000`

### Order Worker (Node.js + TypeScript)

Background worker for processing orders.

**Setup & Run:**

```bash
cd order-worker
npm install
npm run dev
```

## Available Scripts

### Frontend

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### API Gateway

- `npm run dev` - Start development server
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled application

### Order Worker

- `npm run dev` - Start worker service
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled application

## Technologies

- **Frontend**: Vue.js 3, TypeScript, Vite
- **Backend**: Express.js, TypeScript, Node.js
- **Language**: TypeScript (all services)
- **Package Manager**: npm

## Features

- **Frontend**: Single File Components (SFC) with `<script setup>`, Hot Module Replacement (HMR)
- **API Gateway**: Express middleware, CORS support, request routing
- **Order Worker**: Background job processing, graceful shutdown handling
- **Full TypeScript Support** across all services
