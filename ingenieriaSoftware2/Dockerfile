# Etapa de compilación (Builder) con Maven y JDK 21 (según pom.xml java.version=21)
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Descarga previa de dependencias para aprovechar caché de capas Docker
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copia de código fuente y generación del empaquetado JAR ejecutable
COPY src ./src
RUN mvn clean package -DskipTests -B

# Etapa final de ejecución (Runner) con JRE 21 Alpine ligero
FROM eclipse-temurin:21-jre-alpine AS runner
WORKDIR /app

# Copia del ejecutable generado en la etapa de compilación
COPY --from=builder /app/target/*.jar app.jar

# Render asigna dinámicamente la variable de entorno PORT (por defecto 8080)
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
