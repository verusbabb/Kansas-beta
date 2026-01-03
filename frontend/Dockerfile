# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and config files
COPY . .

# Build arguments for environment variables
# These are passed from Cloud Build and baked into the build
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_AUTH0_DOMAIN
ARG VITE_AUTH0_CLIENT_ID
ARG VITE_AUTH0_AUDIENCE

# Set as environment variables for the build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_AUTH0_DOMAIN=${VITE_AUTH0_DOMAIN}
ENV VITE_AUTH0_CLIENT_ID=${VITE_AUTH0_CLIENT_ID}
ENV VITE_AUTH0_AUDIENCE=${VITE_AUTH0_AUDIENCE}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure proper permissions for all files (nginx user needs read access)
RUN chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

