const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");
const { auth } = require("../middleware/auth");

// WhatsApp management page
router.get("/", auth, whatsappController.getWhatsAppPage);

// Initialize WhatsApp session (generate QR code)
router.post("/connect", auth, whatsappController.connectWhatsApp);

// Disconnect WhatsApp session
router.post("/disconnect", auth, whatsappController.disconnectWhatsApp);

// Refresh QR code
router.post("/refresh-qr", auth, whatsappController.refreshQRCode);

// Get connection status (AJAX endpoint)
router.get("/status", auth, whatsappController.getConnectionStatus);

// Send test message
router.post("/test-message", auth, whatsappController.sendTestMessage);

module.exports = router;

