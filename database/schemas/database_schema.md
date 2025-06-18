# Database Schema Design

## Overview

This document defines the complete database schema for the SaaS WhatsApp Notification System. The schema is designed to support multi-tenant architecture, subscription management, and comprehensive audit logging.

## Database Tables

### 1. users
Stores client account information and authentication details.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'inactive')),
    email_verified BOOLEAN DEFAULT FALSE,
    whatsapp_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_shop_domain ON users(shop_domain);
CREATE INDEX idx_users_account_status ON users(account_status);
```

### 2. subscriptions
Manages billing and quota information for user accounts.

```sql
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('basic', 'professional', 'enterprise')),
    monthly_limit INTEGER NOT NULL DEFAULT 100,
    current_usage INTEGER DEFAULT 0,
    billing_cycle_start DATE NOT NULL,
    billing_cycle_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')),
    payment_method_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    auto_renew BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_billing_cycle ON subscriptions(billing_cycle_start, billing_cycle_end);
```

### 3. orders
Stores Shopify order information received through webhooks.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shopify_order_id BIGINT NOT NULL,
    order_number VARCHAR(50),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),
    order_total_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    order_status VARCHAR(50),
    financial_status VARCHAR(50),
    fulfillment_status VARCHAR(50),
    line_items_count INTEGER DEFAULT 0,
    shipping_address JSONB,
    billing_address JSONB,
    line_items JSONB,
    tags TEXT,
    note TEXT,
    shopify_created_at TIMESTAMP,
    shopify_updated_at TIMESTAMP,
    webhook_received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_shopify_order_id ON orders(shopify_order_id);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_webhook_received_at ON orders(webhook_received_at);
CREATE UNIQUE INDEX idx_orders_user_shopify_unique ON orders(user_id, shopify_order_id);
```

### 4. messages
Logs all WhatsApp messages sent through the system.

```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video')),
    template_name VARCHAR(100),
    template_variables JSONB,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    delivery_timestamp TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    whatsapp_message_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_order_id ON messages(order_id);
CREATE INDEX idx_messages_recipient_phone ON messages(recipient_phone);
CREATE INDEX idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
```

### 5. whatsapp_sessions
Manages authentication states for Baileys connections.

```sql
CREATE TABLE whatsapp_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    session_data JSONB,
    auth_state JSONB,
    connection_status VARCHAR(20) DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'connecting', 'error')),
    qr_code TEXT,
    qr_expires_at TIMESTAMP,
    last_connected TIMESTAMP,
    last_disconnected TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX idx_whatsapp_sessions_connection_status ON whatsapp_sessions(connection_status);
CREATE UNIQUE INDEX idx_whatsapp_sessions_user_unique ON whatsapp_sessions(user_id);
```

### 6. message_templates
Stores customizable message templates for different events.

```sql
CREATE TABLE message_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('order_created', 'order_paid', 'order_fulfilled', 'order_cancelled', 'order_updated')),
    template_content TEXT NOT NULL,
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_message_templates_user_id ON message_templates(user_id);
CREATE INDEX idx_message_templates_event_type ON message_templates(event_type);
CREATE UNIQUE INDEX idx_message_templates_user_event_unique ON message_templates(user_id, event_type, name);
```

### 7. webhook_logs
Logs all incoming webhook requests for debugging and audit purposes.

```sql
CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    shop_domain VARCHAR(255),
    webhook_topic VARCHAR(100),
    shopify_order_id BIGINT,
    payload JSONB,
    headers JSONB,
    signature_valid BOOLEAN,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_webhook_logs_user_id ON webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_shop_domain ON webhook_logs(shop_domain);
CREATE INDEX idx_webhook_logs_webhook_topic ON webhook_logs(webhook_topic);
CREATE INDEX idx_webhook_logs_processing_status ON webhook_logs(processing_status);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
```

### 8. usage_analytics
Tracks detailed usage analytics for billing and reporting.

```sql
CREATE TABLE usage_analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    webhooks_received INTEGER DEFAULT 0,
    webhooks_processed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_date ON usage_analytics(date);
CREATE UNIQUE INDEX idx_usage_analytics_user_date_unique ON usage_analytics(user_id, date);
```

### 9. admin_users
Stores administrator account information.

```sql
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
    permissions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role ON admin_users(role);
```

### 10. system_settings
Stores global system configuration settings.

```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_system_settings_key ON system_settings(key);
```

## Triggers and Functions

### Update timestamp trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_analytics_updated_at BEFORE UPDATE ON usage_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Usage tracking trigger
```sql
CREATE OR REPLACE FUNCTION update_subscription_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_status = 'sent' AND (OLD.delivery_status IS NULL OR OLD.delivery_status != 'sent') THEN
        UPDATE subscriptions 
        SET current_usage = current_usage + 1 
        WHERE user_id = NEW.user_id 
        AND status = 'active'
        AND billing_cycle_start <= CURRENT_DATE 
        AND billing_cycle_end >= CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_usage_trigger 
AFTER UPDATE ON messages 
FOR EACH ROW 
EXECUTE FUNCTION update_subscription_usage();
```

## Data Relationships

### Primary Relationships
- users → subscriptions (1:1 current subscription)
- users → orders (1:many)
- users → messages (1:many)
- users → whatsapp_sessions (1:1)
- users → message_templates (1:many)
- orders → messages (1:many)

### Foreign Key Constraints
All foreign key relationships include appropriate CASCADE or SET NULL actions to maintain data integrity during deletions.

## Indexes Strategy

### Performance Indexes
- Primary keys (automatic)
- Foreign keys for join performance
- Frequently queried columns (email, phone, status fields)
- Date/timestamp columns for time-based queries
- Composite indexes for complex queries

### Unique Constraints
- User email addresses
- Shop domains per user
- Shopify order IDs per user
- WhatsApp sessions per user

## Data Types and Constraints

### Monetary Values
All monetary values are stored as integers in cents to avoid floating-point precision issues.

### JSON Fields
JSONB is used for flexible data storage while maintaining query performance:
- Order line items and addresses
- Message template variables
- Webhook payloads
- Session authentication data

### Status Enums
Predefined status values ensure data consistency and enable efficient indexing.

## Security Considerations

### Sensitive Data
- Passwords are hashed using bcrypt
- WhatsApp session data is encrypted
- Payment information references external payment processor IDs

### Data Retention
- Webhook logs: 90 days
- Message logs: 1 year
- Usage analytics: Indefinite (for billing)
- Order data: Per user subscription terms

### Access Control
- Row-level security for multi-tenant data isolation
- Admin users have separate authentication system
- API access controlled through JWT tokens

## Backup and Recovery

### Backup Strategy
- Daily full database backups
- Point-in-time recovery capability
- Separate backup of encrypted session data

### Recovery Procedures
- Automated backup verification
- Documented recovery procedures
- Regular disaster recovery testing

## Performance Optimization

### Query Optimization
- Appropriate indexes for common query patterns
- Partitioning for large tables (webhook_logs, messages)
- Connection pooling for application connections

### Monitoring
- Query performance monitoring
- Index usage analysis
- Connection pool monitoring
- Slow query logging

This schema provides a robust foundation for the SaaS WhatsApp Notification System while maintaining flexibility for future enhancements and scalability requirements.

