const bcrypt = require("bcrypt");

exports.adminAuth = (req, res, next) => {
    if (req.session && req.session.admin) {
        // Check if admin session is still valid
        const now = new Date();
        const sessionExpiry = new Date(req.session.admin.loginTime + (4 * 60 * 60 * 1000)); // 4 hours
        
        if (now > sessionExpiry) {
            req.session.destroy();
            return res.redirect("/admin/login?error=session_expired");
        }
        
        // Attach admin info to request
        req.admin = req.session.admin;
        return next();
    }
    
    // Store the original URL for redirect after login
    req.session.returnTo = req.originalUrl;
    res.redirect("/admin/login");
};

exports.requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.redirect("/admin/login");
        }
        
        if (!allowedRoles.includes(req.admin.role)) {
            req.flash("error", "You don't have permission to access this resource");
            return res.redirect("/admin");
        }
        
        next();
    };
};

exports.guestOnly = (req, res, next) => {
    if (req.session && req.session.admin) {
        return res.redirect("/admin");
    }
    next();
};

// Middleware to check if user is super admin
exports.requireSuperAdmin = (req, res, next) => {
    if (!req.admin || req.admin.role !== "super_admin") {
        req.flash("error", "Super admin access required");
        return res.redirect("/admin");
    }
    next();
};

// Middleware to validate admin session and refresh activity
exports.refreshAdminSession = async (req, res, next) => {
    if (req.session && req.session.admin) {
        try {
            // Update last activity time
            req.session.admin.lastActivity = new Date();
            
            // Optionally update database record
            const { AdminUser } = require("../models");
            await AdminUser.update(
                { last_login: new Date() },
                { where: { id: req.session.admin.id } }
            );
        } catch (error) {
            console.error("Error refreshing admin session:", error);
        }
    }
    next();
};

