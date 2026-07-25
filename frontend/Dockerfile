FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
COPY resources/hero ./public/resources/hero

# Normalize background filename if present
RUN if [ -f "public/resources/hero/one platform bacgground.jpg" ]; then \
      mv "public/resources/hero/one platform bacgground.jpg" "public/resources/hero/one-platform-background.jpg"; \
    fi

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
