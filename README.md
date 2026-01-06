# 🍳 AI CookBook

An AI-powered recipe assistant application built with Vue.js frontend and NestJS microservices backend.

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js)
![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Docker Deployment](#-docker-deployment)
- [Technologies](#-technologies)

## ✨ Features

- 🤖 **AI Chat** - Get personalized recipe recommendations
- 👤 **User Authentication** - Secure signup and login
- 📦 **Order Management** - Create and track recipe orders
- 🎨 **Modern UI** - Clean and responsive Vue.js interface
- 🐳 **Docker Support** - Easy containerized deployment

## 📁 Project Structure

```
AICookBook/
├── src/                          # Vue.js Frontend
│   ├── components/               # Reusable Vue components
│   │   ├── HelloWorld.vue
│   │   └── RecipeDisplay.vue
│   ├── pages/                    # Page components
│   │   ├── Chat.vue              # AI chat interface
│   │   ├── Login.vue             # Login page
│   │   ├── SignUp.vue            # Registration page
│   │   └── Settings.vue          # User settings
│   ├── assets/                   # Static assets
│   ├── App.vue                   # Root component
│   ├── main.ts                   # Frontend entry point
│   └── style.css                 # Global styles
│
├── api-gateway/                  # NestJS API Gateway
│   └── src/
│       ├── auth/                 # Authentication module
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── dto/auth.dto.ts
│       ├── chat/                 # Chat module
│       │   ├── chat.controller.ts
│       │   ├── chat.service.ts
│       │   └── dto/chat.dto.ts
│       ├── order/                # Order module
│       │   ├── order.controller.ts
│       │   ├── order.service.ts
│       │   └── dto/order.dto.ts
│       ├── app.module.ts
│       └── main.ts
│
├── order-worker/                 # Background Order Worker
│   └── src/
│       └── index.ts
│
├── docker-compose.yml            # Docker orchestration
├── Dockerfile.frontend           # Frontend container
└── package.json                  # Root package config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chhun911/IP_project.git
   cd IP_project
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install API Gateway Dependencies**
   ```bash
   cd api-gateway
   npm install
   ```

4. **Install Order Worker Dependencies**
   ```bash
   cd ../order-worker
   npm install
   ```

### Running the Application

#### Start the API Gateway (Terminal 1)
```bash
cd api-gateway
npm start
```
API runs on: `http://localhost:3000`

#### Start the Frontend (Terminal 2)
```bash
npm run dev
```
Frontend runs on: `http://localhost:5173`

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Login user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message to AI |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orders` | Get all orders |
| `GET` | `/api/orders/:id` | Get order by ID |
| `POST` | `/api/orders` | Create new order |
| `PUT` | `/api/orders/:id` | Update order |
| `DELETE` | `/api/orders/:id` | Delete order |

## 🐳 Docker Deployment

### Using Docker Compose

```bash
docker-compose up --build
```

This will start:
- Frontend on port `5173`
- API Gateway on port `3000`
- Order Worker service

### Individual Containers

```bash
# Build frontend
docker build -f Dockerfile.frontend -t aicookbook-frontend .

# Build API Gateway
docker build -f api-gateway/Dockerfile -t aicookbook-api ./api-gateway
```

## 🛠 Technologies

| Layer | Technology |
|-------|------------|
| **Frontend** | Vue.js 3, TypeScript, Vite |
| **Backend** | NestJS, Express, TypeScript |
| **Styling** | CSS3 |
| **Containerization** | Docker, Docker Compose |
| **Package Manager** | npm |

## 📜 Available Scripts

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

### API Gateway
| Command | Description |
|---------|-------------|
| `npm start` | Start the NestJS server |
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |

## 👥 Contributors

- **chhun911** - [GitHub](https://github.com/chhun911)

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">Made with ❤️ for Internet Programming Project</p>
