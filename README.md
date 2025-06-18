# SaaS WhatsApp Notification System

A comprehensive Software-as-a-Service platform that integrates with Shopify stores to automatically send WhatsApp notifications to customers when orders are created, updated, or fulfilled.

## Features

- **Shopify Integration**: Receives real-time webhook events from Shopify stores
- **WhatsApp Automation**: Sends automated WhatsApp messages using Baileys library
- **QR Code Authentication**: Easy WhatsApp device pairing through QR code scanning
- **Subscription Management**: Flexible subscription plans with notification limits
- **Multi-tenant Architecture**: Supports multiple Shopify stores simultaneously
- **Admin Dashboard**: Comprehensive management interface for administrators
- **Usage Analytics**: Detailed reporting and analytics for notification usage
- **Secure Webhook Processing**: HMAC verification and secure data handling

## Technology Stack

### Backend
- **Runtime**: Node.js 17+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Caching**: Redis
- **WhatsApp**: Baileys library
- **Authentication**: JWT tokens

### Frontend
- **Framework**: React.js
- **State Management**: Redux/Context API
- **UI Library**: Material-UI or Tailwind CSS
- **Build Tool**: Vite or Create React App

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose / Kubernetes
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack

## Project Structure

```
saas-whatsapp-system/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   └── utils/          # Utility functions
│   ├── config/             # Configuration files
│   └── tests/              # Test files
├── frontend/               # React admin dashboard
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── database/               # Database related files
│   ├── migrations/         # Database migrations
│   ├── seeds/              # Seed data
│   └── schemas/            # Database schemas
├── docs/                   # Documentation
├── scripts/                # Deployment and utility scripts
└── docker-compose.yml      # Docker composition
```

## Getting Started

### Prerequisites

- Node.js 17 or higher
- PostgreSQL 12 or higher
- Redis 6 or higher
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd saas-whatsapp-system
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Set up environment variables:
```bash
cp backend/.env.example backend/.env
# Edit .env file with your configuration
```

5. Set up the database:
```bash
cd backend
npm run migrate
npm run seed
```

6. Start the development servers:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### Docker Setup

1. Build and start all services:
```bash
docker-compose up --build
```

2. Run database migrations:
```bash
docker-compose exec backend npm run migrate
```

## Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/saas_whatsapp
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Shopify
SHOPIFY_WEBHOOK_SECRET=your-shopify-webhook-secret

# WhatsApp (Baileys)
WHATSAPP_SESSION_PATH=./sessions

# Server
PORT=3000
NODE_ENV=development

# Monitoring
LOG_LEVEL=info
```

### Shopify Webhook Setup

1. Create a Shopify app in your Partner Dashboard
2. Configure webhook endpoints:
   - `https://your-domain.com/webhooks/shopify/orders/create`
   - `https://your-domain.com/webhooks/shopify/orders/paid`
   - `https://your-domain.com/webhooks/shopify/orders/fulfilled`
3. Set webhook format to JSON
4. Configure HMAC verification

## API Documentation

### Webhook Endpoints

#### POST /webhooks/shopify/orders/create
Receives Shopify order creation events.

**Headers:**
- `X-Shopify-Hmac-Sha256`: HMAC signature for verification
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Topic`: Webhook topic

**Response:**
- `200 OK`: Webhook processed successfully
- `400 Bad Request`: Invalid payload or signature
- `500 Internal Server Error`: Processing error

### Admin API

#### Authentication
All admin API endpoints require JWT authentication:
```
Authorization: Bearer <jwt-token>
```

#### User Management
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

#### Subscription Management
- `GET /api/subscriptions` - List subscriptions
- `POST /api/subscriptions` - Create subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `GET /api/subscriptions/:id/usage` - Get usage statistics

## WhatsApp Integration

### QR Code Authentication

1. Generate QR code for new client:
```javascript
const qrCode = await whatsappService.generateQRCode(userId);
```

2. Client scans QR code with WhatsApp
3. System receives authentication confirmation
4. Session is saved for persistent connection

### Message Templates

Configure message templates for different order events:

```javascript
const templates = {
  orderCreated: "Hi {customerName}! Your order #{orderNumber} has been confirmed. Total: {orderTotal}. Thank you for shopping with us!",
  orderPaid: "Payment received for order #{orderNumber}. We're preparing your items for shipment.",
  orderFulfilled: "Great news! Your order #{orderNumber} has been shipped. Tracking: {trackingNumber}"
};
```

## Subscription Plans

### Basic Plan
- 100 notifications/month
- Basic analytics
- Email support

### Professional Plan
- 1,000 notifications/month
- Advanced analytics
- Priority support
- Custom message templates

### Enterprise Plan
- Unlimited notifications
- White-label solution
- Dedicated support
- Custom integrations

## Monitoring and Logging

### Health Checks
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status

### Metrics
- Webhook processing time
- Message delivery rate
- Active WhatsApp connections
- Subscription usage

### Logging
All system events are logged with appropriate levels:
- `ERROR`: System errors and failures
- `WARN`: Warning conditions
- `INFO`: General information
- `DEBUG`: Detailed debugging information

## Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

### Integration Tests
```bash
npm run test:integration
```

## Deployment

### Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Run database migrations:
```bash
npm run migrate:prod
```

4. Start the application:
```bash
npm start
```

### Docker Deployment

1. Build production images:
```bash
docker-compose -f docker-compose.prod.yml build
```

2. Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Security Considerations

- All webhook payloads are verified using HMAC signatures
- JWT tokens for API authentication
- Rate limiting on all endpoints
- Input validation and sanitization
- Encrypted storage of sensitive data
- Regular security audits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@example.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

