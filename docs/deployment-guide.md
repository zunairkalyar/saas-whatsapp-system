# SaaS WhatsApp Notification System - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [SSL Configuration](#ssl-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Production Checklist](#production-checklist)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection

### Software Requirements

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: Latest version
- **Node.js**: 18+ (for development)
- **PostgreSQL**: 15+ (if not using Docker)
- **Redis**: 6+ (if not using Docker)

### Domain and SSL

- **Domain name**: Configured and pointing to your server
- **SSL certificate**: Valid SSL certificate (Let's Encrypt recommended)
- **DNS records**: A record pointing to your server IP

## Environment Setup

### 1. Server Preparation

#### Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Install Additional Tools
```bash
# Install essential tools
sudo apt install -y curl wget git unzip

# Install Node.js (for development)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/saas-whatsapp-system.git
cd saas-whatsapp-system

# Create necessary directories
mkdir -p ssl monitoring/grafana/dashboards monitoring/grafana/datasources
```

### 3. Environment Configuration

#### Create Environment File
```bash
# Copy example environment file
cp backend/nodejs-app/.env.example backend/nodejs-app/.env

# Edit environment variables
nano backend/nodejs-app/.env
```

#### Environment Variables
```env
# Database
DATABASE_URL=postgresql://postgres:postgres_password@postgres:5432/saas_whatsapp
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Shopify
SHOPIFY_WEBHOOK_SECRET=your-shopify-webhook-secret

# WhatsApp (Baileys)
WHATSAPP_SESSION_PATH=./whatsapp_sessions

# Server
PORT=3000
NODE_ENV=production

# Monitoring
LOG_LEVEL=info

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Database Setup

### 1. PostgreSQL Configuration

#### Using Docker (Recommended)
The Docker Compose file includes PostgreSQL configuration. No additional setup required.

#### Manual PostgreSQL Setup
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
CREATE DATABASE saas_whatsapp;
CREATE USER saas_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE saas_whatsapp TO saas_user;
\q
```

### 2. Redis Configuration

#### Using Docker (Recommended)
Redis is included in the Docker Compose configuration.

#### Manual Redis Setup
```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

Add/modify these settings:
```conf
bind 127.0.0.1
port 6379
requirepass your_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru
```

```bash
# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

## Application Deployment

### 1. Docker Deployment (Recommended)

#### Build and Start Services
```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

#### Run Database Migrations
```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec backend npm run seed
```

### 2. Manual Deployment

#### Install Dependencies
```bash
cd backend/nodejs-app
npm install --production
```

#### Build Application
```bash
# No build step required for Node.js
npm run build
```

#### Start Application
```bash
# Using PM2 (recommended for production)
npm install -g pm2
pm2 start app.js --name "saas-whatsapp"

# Or using systemd
sudo nano /etc/systemd/system/saas-whatsapp.service
```

Systemd service file:
```ini
[Unit]
Description=SaaS WhatsApp Notification System
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/saas-whatsapp-system/backend/nodejs-app
ExecStart=/usr/bin/node app.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable saas-whatsapp
sudo systemctl start saas-whatsapp
```

## SSL Configuration

### 1. Let's Encrypt SSL (Recommended)

#### Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be stored in:
# /etc/letsencrypt/live/your-domain.com/
```

#### Copy Certificates
```bash
# Copy certificates to project directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Set proper permissions
sudo chown -R $USER:$USER ssl/
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

#### Auto-renewal
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
sudo crontab -e
```

Add this line:
```
0 12 * * * /usr/bin/certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /path/to/saas-whatsapp-system/ssl/cert.pem && cp /etc/letsencrypt/live/your-domain.com/privkey.pem /path/to/saas-whatsapp-system/ssl/key.pem && docker-compose restart nginx
```

### 2. Self-Signed SSL (Development)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Monitoring Setup

### 1. Prometheus Configuration

#### Update Prometheus Config
```bash
# Edit Prometheus configuration
nano monitoring/prometheus.yml
```

Add your domain:
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'saas-whatsapp-backend'
    static_configs:
      - targets: ['your-domain.com:3000']
    metrics_path: '/health/metrics'
    scrape_interval: 10s
```

### 2. Grafana Setup

#### Access Grafana
1. Open browser to `https://your-domain.com:3001`
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. Change password when prompted

#### Add Prometheus Data Source
1. Go to Configuration > Data Sources
2. Add Prometheus data source
3. URL: `http://prometheus:9090`
4. Save and test

#### Import Dashboards
1. Go to Dashboards > Import
2. Import the provided dashboard JSON files
3. Configure data sources

### 3. Log Management

#### Configure Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/saas-whatsapp
```

Add configuration:
```
/path/to/saas-whatsapp-system/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        docker-compose restart backend
    endscript
}
```

## Production Checklist

### Security Checklist

- [ ] **Firewall Configuration**
  ```bash
  # Configure UFW firewall
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```

- [ ] **SSL Certificate**: Valid SSL certificate installed
- [ ] **Environment Variables**: All sensitive data in environment variables
- [ ] **Database Security**: Strong passwords and limited access
- [ ] **Rate Limiting**: Configured in Nginx
- [ ] **Backup Strategy**: Database and file backups configured

### Performance Checklist

- [ ] **Database Indexes**: Proper indexes on frequently queried columns
- [ ] **Caching**: Redis caching configured
- [ ] **CDN**: Static assets served via CDN
- [ ] **Monitoring**: Prometheus and Grafana configured
- [ ] **Logging**: Structured logging implemented

### Reliability Checklist

- [ ] **Health Checks**: Application health checks configured
- [ ] **Auto-restart**: Services configured to restart on failure
- [ ] **Backup**: Automated backup system
- [ ] **Monitoring**: Alerts configured for critical issues
- [ ] **Documentation**: Deployment and maintenance procedures documented

## Maintenance

### 1. Regular Maintenance Tasks

#### Daily
- Check application logs for errors
- Monitor system resources
- Verify WhatsApp connections

#### Weekly
- Review webhook logs
- Check subscription usage
- Update system packages
- Review security logs

#### Monthly
- Update SSL certificates
- Review and update dependencies
- Analyze performance metrics
- Backup verification

### 2. Backup Procedures

#### Database Backup
```bash
# Create backup script
nano backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U postgres saas_whatsapp > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete
```

#### File Backup
```bash
# Backup important files
tar -czf /backups/files/saas-whatsapp_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /path/to/saas-whatsapp-system
```

### 3. Update Procedures

#### Application Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose up -d --build

# Run migrations
docker-compose exec backend npm run migrate
```

#### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services if needed
docker-compose restart
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptoms**: Application fails to start or crashes
**Diagnosis**:
```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose exec backend env | grep -E "(DATABASE|REDIS|JWT)"
```

**Solutions**:
- Verify environment variables are set correctly
- Check database connectivity
- Ensure all required services are running

#### 2. Database Connection Issues

**Symptoms**: Database connection errors
**Diagnosis**:
```bash
# Test database connection
docker-compose exec backend npm run migrate

# Check PostgreSQL logs
docker-compose logs postgres
```

**Solutions**:
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure database exists and user has permissions

#### 3. WhatsApp Connection Problems

**Symptoms**: WhatsApp QR codes not working or connections dropping
**Diagnosis**:
```bash
# Check WhatsApp service logs
docker-compose logs backend | grep -i whatsapp

# Check session files
ls -la backend/nodejs-app/whatsapp_sessions/
```

**Solutions**:
- Clear WhatsApp sessions and reconnect
- Check internet connectivity
- Verify Baileys library version

#### 4. Webhook Issues

**Symptoms**: Shopify webhooks not being received
**Diagnosis**:
```bash
# Check webhook logs
curl -X GET https://your-domain.com/webhooks/logs

# Test webhook endpoint
curl -X POST https://your-domain.com/webhooks/shopify/orders/create \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Solutions**:
- Verify webhook URLs in Shopify
- Check webhook secret configuration
- Ensure SSL certificate is valid

#### 5. Performance Issues

**Symptoms**: Slow response times or high resource usage
**Diagnosis**:
```bash
# Check system resources
docker stats

# Check application metrics
curl https://your-domain.com/health/metrics
```

**Solutions**:
- Scale up resources if needed
- Optimize database queries
- Implement caching strategies

### Emergency Procedures

#### System Recovery
```bash
# Stop all services
docker-compose down

# Restore from backup
gunzip -c /backups/database/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
docker-compose exec -T postgres psql -U postgres saas_whatsapp

# Restart services
docker-compose up -d
```

#### Rollback Deployment
```bash
# Revert to previous version
git checkout HEAD~1

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Support Resources

- **Documentation**: `/docs/` directory
- **Logs**: Application and system logs
- **Monitoring**: Prometheus and Grafana dashboards
- **Community**: GitHub issues and discussions
- **Professional Support**: Contact support team

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying the SaaS WhatsApp Notification System in production. Follow the checklist and procedures to ensure a secure, reliable, and maintainable deployment.

For additional support or questions, refer to the troubleshooting section or contact the development team. 