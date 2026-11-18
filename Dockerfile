# Imagem única: compila o front (React), embute no backend (Spring Boot) e roda o .jar.

# 1. Front
FROM node:22-alpine AS front
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# O vite.config.ts grava o resultado em ../backend/src/main/resources/static
RUN mkdir -p ../backend/src/main/resources && npm run build

# 2. Backend
FROM maven:3.9-eclipse-temurin-21 AS back
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
COPY --from=front /app/backend/src/main/resources/static ./src/main/resources/static
RUN mvn -B -q -DskipTests package

# 3. Execução
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S ruralmed && adduser -S ruralmed -G ruralmed
COPY --from=back /app/backend/target/ruralmed-*.jar app.jar
USER ruralmed
# Memória enxuta para caber no plano gratuito (512 MB)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
