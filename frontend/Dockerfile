# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# This runs Vite's build command to create the production files
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
# Copy the built files from Stage 1 into Nginx
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]