const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('./database');

// Create session store using Sequelize
const sessionStore = new SequelizeStore({
    db: sequelize,
    tableName: 'sessions',
    checkExpirationInterval: 15 * 60 * 1000, // Check every 15 minutes
    expiration: 24 * 60 * 60 * 1000 // 24 hours
});

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS attacks
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict' // CSRF protection
    },
    name: 'saas.whatsapp.sid' // Custom session name
};

// Sync session store
sessionStore.sync().catch(err => {
    console.error('Unable to sync session store:', err);
});

module.exports = sessionConfig;

