# SaaS WhatsApp Notification System - API Documentation

## Overview

The SaaS WhatsApp Notification System provides a comprehensive API for managing WhatsApp notifications for Shopify stores. This API allows you to integrate WhatsApp messaging capabilities into your e-commerce workflow.

## Base URL

```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

Most API endpoints require authentication. The system uses JWT tokens for authentication.

### Getting a JWT Token

1. Register or login through the web interface
2. The system will set a session cookie automatically
3. For API access, use the session cookie or implement JWT token extraction

## API Endpoints

### Authentication

#### POST /register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "shop_domain": "mystore.myshopify.com"
}
```

**Response:**
- `302` - Redirect to dashboard on success
- `400` - Validation error
- `409` - Email already exists

#### POST /login
Login to an existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
- `302` - Redirect to dashboard on success
- `401` - Invalid credentials

#### POST /logout
Logout from the current session.

**Response:**
- `200` - Successfully logged out

### WhatsApp Management

#### GET /whatsapp/qr
Generate a QR code for WhatsApp authentication.

**Response:**
```json
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "sessionId": "session_123456",
  "status": "pending"
}
```

#### POST /whatsapp/send
Send a WhatsApp message.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "message": "Hello from your store!",
  "sessionId": "session_123456"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123456",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### GET /whatsapp/status
Get the current WhatsApp session status.

**Response:**
```json
{
  "status": "authenticated",
  "phoneNumber": "+1234567890",
  "lastSeen": "2024-01-01T12:00:00Z"
}
```

#### POST /whatsapp/logout
Logout from WhatsApp and clear session.

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp session cleared"
}
```

### Webhook Endpoints

#### POST /webhooks/shopify/orders/create
Handle Shopify order creation webhooks.

**Headers:**
- `X-Shopify-Hmac-Sha256`: HMAC signature for verification
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Topic`: Webhook topic

**Request Body:** Shopify order data

**Response:**
- `200` - Webhook processed successfully
- `400` - Invalid payload or signature
- `404` - Shop not found
- `403` - Subscription limit exceeded

#### POST /webhooks/shopify/orders/paid
Handle Shopify order payment webhooks.

**Headers:** Same as orders/create

**Response:** Same as orders/create

#### POST /webhooks/shopify/orders/fulfilled
Handle Shopify order fulfillment webhooks.

**Headers:** Same as orders/create

**Response:** Same as orders/create

### Subscription Management

#### GET /subscription
Get current subscription details.

**Response:**
```json
{
  "plan": {
    "name": "Professional",
    "price": 29.99,
    "notification_limit": 1000,
    "features": ["Advanced analytics", "Priority support"]
  },
  "status": "active",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "notifications_used": 150,
  "notifications_remaining": 850
}
```

#### POST /subscription/upgrade
Upgrade subscription plan.

**Request Body:**
```json
{
  "planId": "plan_123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription upgraded successfully"
}
```

### Dashboard API

#### GET /dashboard
Get dashboard statistics.

**Response:**
```json
{
  "stats": {
    "total_notifications": 1250,
    "notifications_this_month": 150,
    "success_rate": 98.5,
    "active_whatsapp_sessions": 1
  },
  "recent_activity": [
    {
      "type": "order_created",
      "order_number": "#1001",
      "customer": "John Doe",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Webhook Logs

#### GET /webhooks/logs
Get webhook processing logs.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (processed, failed, pending)
- `shop_domain`: Filter by shop domain

**Response:**
```json
{
  "logs": [
    {
      "id": "log_123456",
      "shop_domain": "mystore.myshopify.com",
      "topic": "orders/create",
      "status": "processed",
      "processing_time": 150,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Health Check

#### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 104857600,
    "external": 2097152,
    "rss": 62914560
  },
  "version": "1.0.0"
}
```

#### GET /health/detailed
Detailed health check with service status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "uptime": 3600,
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 104857600,
    "external": 2097152,
    "rss": 62914560
  },
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "redis": {
      "status": "healthy",
      "message": "Redis connection successful"
    },
    "environment": {
      "status": "healthy",
      "message": "All required environment variables are set"
    }
  }
}
```

#### GET /health/metrics
Prometheus metrics endpoint.

**Response:** Plain text Prometheus metrics format

## Error Responses

All API endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Please login to access this resource"
}
```

### 403 Forbidden
```json
{
  "error": "Subscription limit exceeded",
  "message": "You have reached your monthly notification limit"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "message": "The requested resource does not exist"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API endpoints**: 10 requests per 15 minutes per IP
- **Webhook endpoints**: 30 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Webhook Security

Shopify webhooks are secured using HMAC-SHA256 signatures:

1. Shopify sends webhook with `X-Shopify-Hmac-Sha256` header
2. System verifies signature using webhook secret
3. Invalid signatures result in 400 Bad Request response

## WebSocket Events

The system supports real-time updates via WebSocket connections:

### Connection
```javascript
const socket = io('https://your-domain.com');
```

### Events

#### whatsapp_status_update
```javascript
socket.on('whatsapp_status_update', (data) => {
  console.log('WhatsApp status:', data.status);
});
```

#### notification_sent
```javascript
socket.on('notification_sent', (data) => {
  console.log('Notification sent:', data.messageId);
});
```

#### webhook_received
```javascript
socket.on('webhook_received', (data) => {
  console.log('Webhook received:', data.topic);
});
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

class WhatsAppAPI {
  constructor(baseURL, sessionCookie) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Cookie': `user_id=${sessionCookie}`
      }
    });
  }

  async sendMessage(phone, message) {
    const response = await this.client.post('/whatsapp/send', {
      phone,
      message
    });
    return response.data;
  }

  async getSubscription() {
    const response = await this.client.get('/subscription');
    return response.data;
  }
}
```

### Python
```python
import requests

class WhatsAppAPI:
    def __init__(self, base_url, session_cookie):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Cookie': f'user_id={session_cookie}'})
    
    def send_message(self, phone, message):
        response = self.session.post(f'{self.base_url}/whatsapp/send', json={
            'phone': phone,
            'message': message
        })
        return response.json()
    
    def get_subscription(self):
        response = self.session.get(f'{self.base_url}/subscription')
        return response.json()
```

## Support

For API support and questions:
- Email: api-support@example.com
- Documentation: https://docs.example.com
- Status page: https://status.example.com 