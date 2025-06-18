const { body } = require("express-validator");

exports.validateRegistration = [
    body("email")
        .isEmail().withMessage("Please enter a valid email address.")
        .normalizeEmail(),
    body("password")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long.")
        .matches(/\d/).withMessage("Password must contain a number.")
        .matches(/[a-z]/).withMessage("Password must contain a lowercase letter.")
        .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter.")
        .matches(/[^\w]/).withMessage("Password must contain a special character."),
    body("confirm_password").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Password confirmation does not match password.");
        }
        return true;
    }),
    body("shop_domain")
        .notEmpty().withMessage("Shop domain is required.")
        .isURL({ require_protocol: false, require_valid_protocol: false }).withMessage("Please enter a valid shop domain (e.g., your-shop.myshopify.com).")
        .trim()
];

exports.validateLogin = [
    body("email")
        .isEmail().withMessage("Please enter a valid email address.")
        .normalizeEmail(),
    body("password")
        .notEmpty().withMessage("Password is required.")
];


