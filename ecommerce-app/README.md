# E-commerce Application

A professional e-commerce web application with React frontend and Go backend.

## Features

### Frontend (React)
- User authentication (login/register)
- Product browsing and search
- Shopping cart and checkout
- User profile management
- Order history and tracking
- Admin dashboard for product/order management
- Sales reports and analytics

### Backend (Go)
- JWT authentication
- RESTful APIs
- VNPay payment integration
- Partner integration system with client credentials
- Payment webhooks
- Database management with PostgreSQL

## Project Structure

```
ecommerce-app/
├── backend/          # Go backend server
│   ├── cmd/         # Application entrypoints
│   ├── internal/    # Internal application code
│   ├── pkg/         # Public library code
│   ├── migrations/  # Database migrations
│   └── configs/     # Configuration files
├── frontend/        # React frontend application
│   ├── src/         # Source code
│   ├── public/      # Public assets
│   └── package.json # Dependencies
└── docker-compose.yml # Docker services
```

## Quick Start

1. Clone and navigate to the project:
```bash
cd ecommerce-app
```

2. Start the backend:
```bash
cd backend
go run cmd/main.go
```

3. Start the frontend:
```bash
cd frontend
npm install
npm start
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories with the required environment variables (see `.env.example` files).
