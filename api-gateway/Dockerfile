FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

# Build TypeScript to /app/dist during image build
RUN npm run build

EXPOSE 3000

# Run the compiled application
CMD ["npm", "start"]
