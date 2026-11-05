FROM node:22-alpine AS build

WORKDIR /app

COPY admin_atala/package.json admin_atala/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY admin_atala/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist/administrazio-atala/browser /usr/share/nginx/html
COPY deploy/nginx-admin.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
