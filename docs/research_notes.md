# SaaS WhatsApp Notification System - Research Notes

## Shopify Webhooks Research

### Key Findings:
- Shopify provides webhook events for various store activities including orders/create, orders/paid, orders/update, etc.
- Webhooks send HTTP POST requests with JSON payloads to specified endpoints
- Authentication uses HMAC verification with X-Shopify-Hmac-Sha256 header
- Webhook subscriptions can be created via API or app configuration file
- Important headers: X-Shopify-Hook-Id, X-Shopify-Triggered-At, X-Shopify-Shop-Domain

### Order Webhook Events:
- orders/create - Triggered when new order is created
- orders/paid - Triggered when order payment is completed
- orders/cancelled - Triggered when order is cancelled
- orders/fulfilled - Triggered when order is fulfilled
- orders/updated - Triggered when order details are updated

### Webhook Payload Structure:
- Contains complete order information including customer details, line items, shipping info
- Includes order ID, customer email, phone, total amount, order status
- Provides timestamps for created_at, updated_at fields

## Baileys WhatsApp Library Research

### Key Features:
- TypeScript/JavaScript library for WhatsApp Web API
- Uses WebSocket protocol, not browser automation
- Requires Node.js 17+
- QR code authentication for device pairing
- Supports multi-device API

### Authentication Process:
- Uses QR code scanning for initial authentication
- Maintains auth state for persistent connections
- Built-in useMultiFileAuthState for demo purposes (not recommended for production)
- Supports pairing codes as alternative to QR

### Message Capabilities:
- Send text messages
- Send media (images, documents, audio)
- Receive messages and events
- Group messaging support
- Message status tracking

### Connection Management:
- Event-based architecture using EventEmitter
- Automatic reconnection handling
- Connection state monitoring
- Session persistence

## System Requirements Analysis

### Core Components Needed:
1. Webhook receiver endpoint for Shopify events
2. Database for storing orders, users, subscriptions
3. WhatsApp connection manager using Baileys
4. Notification queue system
5. Subscription management system
6. Admin dashboard
7. User management interface

### Technical Stack:
- Backend: Node.js with Express/Flask
- Database: PostgreSQL or MongoDB
- WhatsApp: Baileys library
- Queue: Redis or in-memory queue
- Frontend: React for admin dashboard

