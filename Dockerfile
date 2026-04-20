# 1. Usamos una imagen de Node.js como base
FROM node:18-alpine

# 2. Creamos la carpeta de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiamos los archivos de dependencias
COPY package*.json ./

# 4. Instalamos las librerías
RUN npm install

# 5. Copiamos el resto del código del proyecto
COPY . .

# 6. Exponemos el puerto que usa Next.js
EXPOSE 3000

# 7. Comando para arrancar la app en modo desarrollo
CMD ["npm", "run", "dev"]