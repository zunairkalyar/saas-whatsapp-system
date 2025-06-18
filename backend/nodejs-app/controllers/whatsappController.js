const { WhatsAppSession, User } = require("../models");
const { 
    initializeWhatsAppSession, 
    disconnectWhatsAppSession, 
    getConnectionStatus,
    refreshQRCode,
    sendWhatsAppMessage 
} = require("../services/whatsappService");

exports.getWhatsAppPage = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        
        // Get user's WhatsApp session
        let whatsappSession = await WhatsAppSession.findByUserId(userId);
        
        if (!whatsappSession) {
            // Create a new session record if it doesn't exist
            whatsappSession = await WhatsAppSession.create({
                user_id: userId,
                connection_status: "disconnected"
            });
        }

        // Get real-time connection status
        const connectionStatus = getConnectionStatus(userId);
        
        res.render("pages/whatsapp/index", {
            title: "WhatsApp Integration",
            layout: "layouts/main",
            whatsappSession: whatsappSession.toJSON(),
            isConnected: connectionStatus.isConnected,
            user: req.session.user
        });
    } catch (err) {
        console.error("Error loading WhatsApp page:", err);
        next(err);
    }
};

exports.connectWhatsApp = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        console.log(`User ${userId} requesting WhatsApp connection`);
        
        // Initialize WhatsApp session
        const result = await initializeWhatsAppSession(userId);
        
        if (result.success) {
            req.flash("success_msg", "WhatsApp connection initiated. Please scan the QR code with your WhatsApp mobile app.");
        } else {
            req.flash("error", `Failed to initialize WhatsApp: ${result.error}`);
        }
        
        res.redirect("/whatsapp");
    } catch (error) {
        console.error("Error connecting WhatsApp:", error);
        req.flash("error", "An unexpected error occurred while connecting WhatsApp.");
        res.redirect("/whatsapp");
    }
};

exports.disconnectWhatsApp = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        console.log(`User ${userId} requesting WhatsApp disconnection`);
        
        // Disconnect WhatsApp session
        const result = await disconnectWhatsAppSession(userId);
        
        if (result.success) {
            req.flash("success_msg", "WhatsApp disconnected successfully.");
        } else {
            req.flash("error", `Failed to disconnect WhatsApp: ${result.error}`);
        }
        
        res.redirect("/whatsapp");
    } catch (error) {
        console.error("Error disconnecting WhatsApp:", error);
        req.flash("error", "An unexpected error occurred while disconnecting WhatsApp.");
        res.redirect("/whatsapp");
    }
};

exports.refreshQRCode = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        console.log(`User ${userId} requesting QR code refresh`);
        
        // Refresh QR code
        const result = await refreshQRCode(userId);
        
        if (result.success) {
            req.flash("success_msg", "QR code refreshed. Please scan the new QR code.");
        } else {
            req.flash("error", `Failed to refresh QR code: ${result.error}`);
        }
        
        res.redirect("/whatsapp");
    } catch (error) {
        console.error("Error refreshing QR code:", error);
        req.flash("error", "An unexpected error occurred while refreshing QR code.");
        res.redirect("/whatsapp");
    }
};

exports.getConnectionStatus = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Get session from database
        const whatsappSession = await WhatsAppSession.findByUserId(userId);
        
        // Get real-time connection status
        const connectionStatus = getConnectionStatus(userId);
        
        res.json({
            success: true,
            session: whatsappSession ? whatsappSession.toJSON() : null,
            isConnected: connectionStatus.isConnected,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error getting connection status:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.sendTestMessage = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            req.flash("error", "Phone number and message are required.");
            return res.redirect("/whatsapp");
        }
        
        // Get user's WhatsApp session
        const whatsappSession = await WhatsAppSession.findByUserId(userId);
        
        if (!whatsappSession || whatsappSession.connection_status !== "connected") {
            req.flash("error", "WhatsApp is not connected. Please connect first.");
            return res.redirect("/whatsapp");
        }
        
        // Send test message
        const result = await sendWhatsAppMessage(whatsappSession, phoneNumber, message);
        
        if (result.success) {
            req.flash("success_msg", `Test message sent successfully to ${phoneNumber}`);
        } else {
            req.flash("error", `Failed to send test message: ${result.error}`);
        }
        
        res.redirect("/whatsapp");
    } catch (error) {
        console.error("Error sending test message:", error);
        req.flash("error", "An unexpected error occurred while sending test message.");
        res.redirect("/whatsapp");
    }
};

