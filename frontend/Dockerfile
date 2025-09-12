FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Accept build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_GOOGLE_CLIENT_ID

# Set environment variables for build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
