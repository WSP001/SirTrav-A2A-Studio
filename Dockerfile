# Use Node.js LTS (Long Term Support)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install system dependencies (FFmpeg for Editor Agent)
RUN apk add --no-cache ffmpeg

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose ports for Vite (5173) and Netlify Functions (8888)
EXPOSE 5173 8888

# Set host to 0.0.0.0 to allow external access from outside the container
ENV HOST=0.0.0.0

# Default command
CMD ["npm", "run", "dev"]