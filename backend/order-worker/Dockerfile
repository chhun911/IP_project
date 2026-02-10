FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Build TypeScript during image build
RUN npm run build

# Run compiled worker
CMD ["npm", "start"]
