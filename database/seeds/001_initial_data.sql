-- Seed Data: 001_initial_data.sql
-- Description: Insert initial system data and default configurations
-- Created: 2025-06-16

-- Insert default system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('app_name', '"SaaS WhatsApp Notifications"', 'Application name', true),
('app_version', '"1.0.0"', 'Current application version', true),
('max_retry_attempts', '3', 'Maximum retry attempts for failed messages', false),
('webhook_timeout_seconds', '30', 'Webhook processing timeout in seconds', false),
('qr_code_expiry_minutes', '5', 'QR code expiry time in minutes', false),
('session_cleanup_days', '30', 'Days to keep inactive WhatsApp sessions', false),
('webhook_log_retention_days', '90', 'Days to retain webhook logs', false),
('message_log_retention_days', '365', 'Days to retain message logs', false),
('default_timezone', '"UTC"', 'Default system timezone', true),
('support_email', '"support@example.com"', 'Support contact email', true),
('maintenance_mode', 'false', 'System maintenance mode flag', false),
('rate_limit_per_minute', '60', 'API rate limit per minute per user', false),
('max_message_length', '4096', 'Maximum message content length', false),
('allowed_file_types', '["image/jpeg", "image/png", "application/pdf", "audio/mpeg"]', 'Allowed file types for media messages', false);

-- Insert default subscription plans configuration
INSERT INTO system_settings (key, value, description, is_public) VALUES
('subscription_plans', '{
  "basic": {
    "name": "Basic Plan",
    "monthly_limit": 100,
    "price_cents": 999,
    "features": ["Basic analytics", "Email support", "Standard templates"]
  },
  "professional": {
    "name": "Professional Plan", 
    "monthly_limit": 1000,
    "price_cents": 2999,
    "features": ["Advanced analytics", "Priority support", "Custom templates", "API access"]
  },
  "enterprise": {
    "name": "Enterprise Plan",
    "monthly_limit": 10000,
    "price_cents": 9999,
    "features": ["Unlimited analytics", "Dedicated support", "White-label", "Custom integrations"]
  }
}', 'Available subscription plans', true);

-- Insert default message templates for system use
INSERT INTO message_templates (user_id, name, event_type, template_content, variables, is_default) VALUES
(NULL, 'Default Order Created', 'order_created', 
'Hi {{customer_first_name}}! 🎉 Your order #{{order_number}} has been confirmed. 

Order Total: {{order_total}}
Status: {{order_status}}

Thank you for shopping with {{shop_name}}! We''ll keep you updated on your order progress.', 
'{"customer_first_name": "Customer first name", "order_number": "Order number", "order_total": "Order total amount", "order_status": "Order status", "shop_name": "Shop name"}', 
true),

(NULL, 'Default Order Paid', 'order_paid',
'Great news {{customer_first_name}}! 💳 Payment for order #{{order_number}} has been confirmed.

Amount: {{order_total}}
Payment Status: {{financial_status}}

We''re now preparing your items for shipment. You''ll receive another update once your order ships!',
'{"customer_first_name": "Customer first name", "order_number": "Order number", "order_total": "Order total amount", "financial_status": "Payment status"}',
true),

(NULL, 'Default Order Fulfilled', 'order_fulfilled',
'Exciting news {{customer_first_name}}! 📦 Your order #{{order_number}} has been shipped!

{{#if tracking_number}}
Tracking Number: {{tracking_number}}
{{/if}}

Your package is on its way and should arrive soon. Thank you for your business!',
'{"customer_first_name": "Customer first name", "order_number": "Order number", "tracking_number": "Tracking number (optional)"}',
true),

(NULL, 'Default Order Cancelled', 'order_cancelled',
'Hi {{customer_first_name}}, we wanted to let you know that order #{{order_number}} has been cancelled.

{{#if cancellation_reason}}
Reason: {{cancellation_reason}}
{{/if}}

{{#if refund_amount}}
A refund of {{refund_amount}} will be processed within 3-5 business days.
{{/if}}

If you have any questions, please don''t hesitate to contact us.',
'{"customer_first_name": "Customer first name", "order_number": "Order number", "cancellation_reason": "Cancellation reason (optional)", "refund_amount": "Refund amount (optional)"}',
true),

(NULL, 'Default Order Updated', 'order_updated',
'Hi {{customer_first_name}}, there''s an update on your order #{{order_number}}.

Order Status: {{order_status}}
{{#if fulfillment_status}}
Fulfillment Status: {{fulfillment_status}}
{{/if}}

{{#if update_message}}
Update: {{update_message}}
{{/if}}

Thanks for your patience!',
'{"customer_first_name": "Customer first name", "order_number": "Order number", "order_status": "Order status", "fulfillment_status": "Fulfillment status (optional)", "update_message": "Custom update message (optional)"}',
true);

-- Insert default admin user (password: admin123 - should be changed in production)
INSERT INTO admin_users (email, password_hash, first_name, last_name, role, permissions, is_active) VALUES
('admin@example.com', '$2b$10$rQZ8kHWKQVnFnxjibfTxaOXbQ8YrVvM8HiO.Kp5Zx1yGqNcRtEwHm', 'System', 'Administrator', 'super_admin', 
'{"users": {"create": true, "read": true, "update": true, "delete": true}, "subscriptions": {"create": true, "read": true, "update": true, "delete": true}, "analytics": {"read": true}, "settings": {"read": true, "update": true}}', 
true);

-- Insert webhook event types configuration
INSERT INTO system_settings (key, value, description, is_public) VALUES
('webhook_events', '{
  "orders/create": {
    "enabled": true,
    "description": "Triggered when a new order is created",
    "default_template": "order_created"
  },
  "orders/paid": {
    "enabled": true,
    "description": "Triggered when an order payment is completed",
    "default_template": "order_paid"
  },
  "orders/fulfilled": {
    "enabled": true,
    "description": "Triggered when an order is fulfilled",
    "default_template": "order_fulfilled"
  },
  "orders/cancelled": {
    "enabled": true,
    "description": "Triggered when an order is cancelled",
    "default_template": "order_cancelled"
  },
  "orders/updated": {
    "enabled": true,
    "description": "Triggered when an order is updated",
    "default_template": "order_updated"
  }
}', 'Supported webhook events and their configurations', false);

-- Insert notification settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('notification_settings', '{
  "retry_intervals": [300, 900, 3600],
  "max_retries": 3,
  "batch_size": 100,
  "rate_limit_per_second": 5,
  "enable_delivery_reports": true,
  "enable_read_receipts": false
}', 'WhatsApp notification delivery settings', false);

-- Insert feature flags
INSERT INTO system_settings (key, value, description, is_public) VALUES
('feature_flags', '{
  "enable_media_messages": true,
  "enable_template_variables": true,
  "enable_custom_templates": true,
  "enable_analytics_export": true,
  "enable_webhook_retry": true,
  "enable_qr_refresh": true,
  "enable_bulk_messaging": false,
  "enable_scheduled_messages": false
}', 'Feature flags for enabling/disabling functionality', false);

-- Insert default currency and localization settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('supported_currencies', '["USD", "EUR", "GBP", "CAD", "AUD", "INR"]', 'List of supported currencies', true),
('default_currency', '"USD"', 'Default currency for pricing', true),
('supported_timezones', '["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney"]', 'List of supported timezones', true),
('date_format', '"YYYY-MM-DD"', 'Default date format', true),
('time_format', '"HH:mm:ss"', 'Default time format', true);

-- Insert API rate limiting configuration
INSERT INTO system_settings (key, value, description, is_public) VALUES
('api_rate_limits', '{
  "webhook": {"requests_per_minute": 1000, "burst_limit": 100},
  "admin": {"requests_per_minute": 300, "burst_limit": 50},
  "user": {"requests_per_minute": 60, "burst_limit": 10},
  "whatsapp": {"messages_per_minute": 20, "burst_limit": 5}
}', 'API rate limiting configuration by endpoint type', false);

-- Insert security settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('security_settings', '{
  "jwt_expiry_hours": 24,
  "refresh_token_expiry_days": 30,
  "password_min_length": 8,
  "require_password_complexity": true,
  "session_timeout_minutes": 60,
  "max_login_attempts": 5,
  "lockout_duration_minutes": 15
}', 'Security and authentication settings', false);

-- Insert monitoring and alerting configuration
INSERT INTO system_settings (key, value, description, is_public) VALUES
('monitoring_settings', '{
  "health_check_interval_seconds": 30,
  "alert_thresholds": {
    "error_rate_percent": 5,
    "response_time_ms": 2000,
    "queue_size": 1000,
    "failed_webhooks_per_hour": 50
  },
  "notification_channels": {
    "email": "alerts@example.com",
    "slack_webhook": null,
    "sms": null
  }
}', 'System monitoring and alerting configuration', false);

-- Create initial usage analytics entry for system tracking
INSERT INTO usage_analytics (user_id, date, messages_sent, messages_delivered, messages_failed, webhooks_received, webhooks_processed) VALUES
(NULL, CURRENT_DATE, 0, 0, 0, 0, 0);

-- Insert sample test data (for development only - remove in production)
-- Test user account
INSERT INTO users (email, password_hash, shop_domain, first_name, last_name, whatsapp_number, account_status, email_verified) VALUES
('test@example.com', '$2b$10$rQZ8kHWKQVnFnxjibfTxaOXbQ8YrVvM8HiO.Kp5Zx1yGqNcRtEwHm', 'test-shop.myshopify.com', 'Test', 'User', '+1234567890', 'active', true);

-- Test subscription for the test user
INSERT INTO subscriptions (user_id, plan_type, monthly_limit, billing_cycle_start, billing_cycle_end, amount_cents) VALUES
(1, 'basic', 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 999);

-- Test WhatsApp session for the test user
INSERT INTO whatsapp_sessions (user_id, connection_status) VALUES
(1, 'disconnected');

-- Test message templates for the test user
INSERT INTO message_templates (user_id, name, event_type, template_content, variables, is_active) VALUES
(1, 'Custom Order Created', 'order_created', 
'Hello {{customer_first_name}}! Your order #{{order_number}} is confirmed. Total: {{order_total}}. Thank you!',
'{"customer_first_name": "Customer first name", "order_number": "Order number", "order_total": "Order total"}',
true);

-- Initialize usage analytics for test user
INSERT INTO usage_analytics (user_id, date) VALUES
(1, CURRENT_DATE);

