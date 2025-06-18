const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateRegistration, validateLogin } = require("../middleware/validation");
const { guest, auth } = require("../middleware/auth");

// Login Page
router.get("/login", guest, authController.getLogin);

// Login Handle
router.post("/login", guest, validateLogin, authController.postLogin);

// Register Page
router.get("/register", guest, authController.getRegister);

// Register Handle
router.post("/register", guest, validateRegistration, authController.postRegister);

// Logout Handle
router.get("/logout", auth, authController.logout);

module.exports = router;


