FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build args for NEXT_PUBLIC_ vars (baked in at build time)
ARG NEXT_PUBLIC_API_URL
ARG UPLOAD_R2_WORKER_API
ARG R2_UPLOAD_API_KEY

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV UPLOAD_R2_WORKER_API=$UPLOAD_R2_WORKER_API
ENV R2_UPLOAD_API_KEY=$R2_UPLOAD_API_KEY

RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
