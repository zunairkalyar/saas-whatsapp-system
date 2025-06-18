const express = require("express");
const router = express.Router();
const { sequelize } = require("../config/database");
const Redis = require("ioredis");

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Basic health check
router.get("/", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || "1.0.0"
    });
});

// Detailed health check
router.get("/detailed", async (req, res) => {
    const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || "1.0.0",
        services: {}
    };

    try {
        // Check database connection
        await sequelize.authenticate();
        health.services.database = {
            status: "healthy",
            message: "Database connection successful"
        };
    } catch (error) {
        health.services.database = {
            status: "unhealthy",
            message: error.message
        };
        health.status = "unhealthy";
    }

    try {
        // Check Redis connection
        await redis.ping();
        health.services.redis = {
            status: "healthy",
            message: "Redis connection successful"
        };
    } catch (error) {
        health.services.redis = {
            status: "unhealthy",
            message: error.message
        };
        health.status = "unhealthy";
    }

    // Check environment variables
    const requiredEnvVars = [
        "DATABASE_URL",
        "JWT_SECRET",
        "SHOPIFY_WEBHOOK_SECRET"
    ];

    health.services.environment = {
        status: "healthy",
        missing: []
    };

    requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            health.services.environment.missing.push(envVar);
            health.services.environment.status = "unhealthy";
            health.status = "unhealthy";
        }
    });

    if (health.services.environment.missing.length === 0) {
        health.services.environment.message = "All required environment variables are set";
    } else {
        health.services.environment.message = `Missing environment variables: ${health.services.environment.missing.join(", ")}`;
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
});

// Metrics endpoint for Prometheus
router.get("/metrics", async (req, res) => {
    try {
        const metrics = {
            // Application metrics
            app_uptime_seconds: process.uptime(),
            app_memory_heap_used_bytes: process.memoryUsage().heapUsed,
            app_memory_heap_total_bytes: process.memoryUsage().heapTotal,
            app_memory_external_bytes: process.memoryUsage().external,
            app_memory_rss_bytes: process.memoryUsage().rss,

            // Database metrics
            db_connections_active: sequelize.connectionManager.pool.size,
            db_connections_idle: sequelize.connectionManager.pool.idle,
            db_connections_pending: sequelize.connectionManager.pool.pending,

            // Redis metrics
            redis_connected: redis.status === "ready" ? 1 : 0
        };

        // Format as Prometheus metrics
        const prometheusMetrics = Object.entries(metrics)
            .map(([key, value]) => `${key} ${value}`)
            .join("\n");

        res.set("Content-Type", "text/plain");
        res.send(prometheusMetrics);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate metrics" });
    }
});

module.exports = router; 