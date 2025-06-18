const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const sessionConfig = require("./config/session");
const { sequelize } = require("./config/database");
const { setupAssociations } = require("./models");
const errorHandler = require("./middleware/errorHandler");
const tenantResolver = require("./middleware/tenantResolver");

// Load environment variables
dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use(limiter);

// Body Parsers
function rawBodySaver(req, res, buf) {
    if (buf && buf.length) {
        req.rawBody = buf.toString('utf8');
    }
}
// Use raw parser for Shopify webhooks so we can verify HMAC using the raw body
app.use('/webhooks/shopify', express.raw({ type: 'application/json', verify: rawBodySaver }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(tenantResolver);

// Session Configuration
app.use(session(sessionConfig));

// View Engine Setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Static Files
app.use(express.static(path.join(__dirname, "public")));

// Setup Model Associations
setupAssociations();

// Test Database Connection and Sync Models
sequelize.authenticate()
    .then(() => {
        console.log("Database connection has been established successfully.");
        return sequelize.sync(); // Sync models with database
    })
    .then(() => {
        console.log("Database models synchronized.");
    })
    .catch(err => {
        console.error("Unable to connect to the database or sync models:", err);
    });

// Import routes
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const webhookRoutes = require("./routes/webhooks");
const whatsappRoutes = require("./routes/whatsapp");
const subscriptionRoutes = require("./routes/subscription");
const adminRoutes = require("./routes/admin");
const healthRoutes = require("./routes/health");

// Routes
app.use("/", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/admin", adminRoutes);
app.use("/health", healthRoutes);

// Error Handling Middleware
app.use(errorHandler.notFound);
app.use(errorHandler.errorHandler);

module.exports = app; // Export the app instance

