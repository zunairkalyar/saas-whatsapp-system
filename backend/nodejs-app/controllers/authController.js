const { User } = require("../models");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

// Render login page
exports.getLogin = (req, res) => {
    res.render("pages/auth/login", {
        title: "Login",
        layout: "layouts/auth",
        errors: req.flash("errors"),
        oldInput: req.flash("oldInput")[0] || {}
    });
};

// Handle login POST request
exports.postLogin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        req.flash("oldInput", req.body);
        return res.redirect("/login");
    }

    const { email, password } = req.body;

    try {
        const user = await User.authenticate(email, password);
        if (!user) {
            req.flash("error", "Invalid credentials or account is inactive.");
            req.flash("oldInput", req.body);
            return res.redirect("/login");
        }

        req.session.user = user.toJSON();
        req.session.isAuthenticated = true;
        req.flash("success_msg", "Logged in successfully!");
        req.session.save(() => {
            res.redirect("/dashboard");
        });
    } catch (err) {
        console.error("Login error:", err);
        req.flash("error", "An unexpected error occurred during login.");
        req.flash("oldInput", req.body);
        next(err);
    }
};

// Render registration page
exports.getRegister = (req, res) => {
    res.render("pages/auth/register", {
        title: "Register",
        layout: "layouts/auth",
        errors: req.flash("errors"),
        oldInput: req.flash("oldInput")[0] || {}
    });
};

// Handle registration POST request
exports.postRegister = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash("errors", errors.array());
        req.flash("oldInput", req.body);
        return res.redirect("/register");
    }

    const { email, password, shop_domain } = req.body;

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash("error", "Email already registered.");
            req.flash("oldInput", req.body);
            return res.redirect("/register");
        }

        const existingShop = await User.findByShopDomain(shop_domain);
        if (existingShop) {
            req.flash("error", "Shop domain already registered.");
            req.flash("oldInput", req.body);
            return res.redirect("/register");
        }

        const newUser = await User.create({
            email,
            password_hash: password, // Hashing is done in model hook
            shop_domain,
            account_status: "active",
            email_verified: false,
            whatsapp_verified: false,
        });

        // Create a basic subscription for the new user
        await newUser.createSubscription({
            plan_type: "basic",
            monthly_limit: 100,
            amount_cents: 999,
            currency: "USD",
            auto_renew: true,
            billing_cycle_start: new Date(),
            billing_cycle_end: new Date(new Date().setMonth(new Date().getMonth() + 1))
        });

        // Create a WhatsApp session entry for the new user
        await newUser.createWhatsapp_session({
            connection_status: "disconnected"
        });

        // Create a daily usage analytics entry for the new user
        await newUser.createUsage_analytic({
            date: new Date(),
            messages_sent: 0
        });

        req.flash("success_msg", "Registration successful! Please log in.");
        res.redirect("/login");
    } catch (err) {
        console.error("Registration error:", err);
        req.flash("error", "An unexpected error occurred during registration.");
        req.flash("oldInput", req.body);
        next(err);
    }
};

// Handle logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.redirect("/dashboard"); // Or an error page
        }
        res.clearCookie("saas.whatsapp.sid"); // Clear the session cookie
        req.flash("success_msg", "You have been logged out.");
        res.redirect("/login");
    });
};


