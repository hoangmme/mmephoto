FROM node:20-bullseye-slim

WORKDIR /app

# Install native dependencies required by node-canvas
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the API and web port
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server.js"]
