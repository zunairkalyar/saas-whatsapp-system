const { Message, MessageTemplate, WhatsAppSession, UsageAnalytics } = require("../models");
const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

// Store active WhatsApp connections
const activeConnections = new Map();

exports.sendWhatsAppMessage = async (whatsappSession, phoneNumber, messageContent) => {
    try {
        const connection = activeConnections.get(whatsappSession.user_id);
        
        if (!connection || connection.user?.id !== "connected") {
            throw new Error("WhatsApp not connected");
        }

        // Format phone number (ensure it has country code)
        const formattedNumber = formatPhoneNumber(phoneNumber);
        
        // Send message
        const messageResult = await connection.sendMessage(formattedNumber, { 
            text: messageContent 
        });

        console.log(`WhatsApp message sent to ${formattedNumber}:`, messageResult.key.id);
        
        return {
            success: true,
            messageId: messageResult.key.id,
            timestamp: new Date()
        };
        
    } catch (error) {
        console.error("Error sending WhatsApp message:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

exports.initializeWhatsAppSession = async (userId) => {
    try {
        console.log(`Initializing WhatsApp session for user ${userId}`);
        
        // Create session directory
        const sessionPath = path.join(process.env.WHATSAPP_SESSION_PATH || "./whatsapp_sessions", `session_${userId}`);
        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        // Get auth state
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        
        // Get latest Baileys version
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

        // Create WhatsApp socket
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false, // We'll handle QR code ourselves
            browser: ["SaaS WhatsApp Bot", "Chrome", "1.0.0"],
            generateHighQualityLinkPreview: true,
        });

        let qrCodeData = null;
        let connectionPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Connection timeout"));
            }, 60000); // 1 minute timeout

            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    // Generate QR code
                    qrCodeData = await QRCode.toDataURL(qr);
                    console.log(`QR code generated for user ${userId}`);
                    
                    // Update session with QR code
                    const session = await WhatsAppSession.findByUserId(userId);
                    if (session) {
                        await session.update({
                            qr_code: qrCodeData,
                            qr_expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                            connection_status: "qr_generated"
                        });
                    }
                }
                
                if (connection === "close") {
                    clearTimeout(timeout);
                    const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log("Connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect);
                    
                    // Update session status
                    const session = await WhatsAppSession.findByUserId(userId);
                    if (session) {
                        await session.update({
                            connection_status: "disconnected",
                            last_disconnected: new Date(),
                            error_message: lastDisconnect?.error?.message || null
                        });
                    }
                    
                    // Remove from active connections
                    activeConnections.delete(userId);
                    
                    if (shouldReconnect) {
                        // Attempt to reconnect after a delay
                        setTimeout(() => {
                            exports.initializeWhatsAppSession(userId);
                        }, 5000);
                    }
                    
                    reject(new Error("Connection closed"));
                } else if (connection === "open") {
                    clearTimeout(timeout);
                    console.log(`WhatsApp connected for user ${userId}`);
                    
                    // Store active connection
                    activeConnections.set(userId, sock);
                    
                    // Update session status
                    const session = await WhatsAppSession.findByUserId(userId);
                    if (session) {
                        await session.update({
                            connection_status: "connected",
                            last_connected: new Date(),
                            qr_code: null,
                            qr_expires_at: null,
                            error_message: null
                        });
                    }
                    
                    resolve({
                        success: true,
                        connection: sock
                    });
                }
            });

            sock.ev.on("creds.update", saveCreds);
        });

        await connectionPromise;
        
        return {
            success: true,
            qrCode: qrCodeData,
            sessionId: `session_${userId}_${Date.now()}`
        };
        
    } catch (error) {
        console.error("Error initializing WhatsApp session:", error);
        
        // Update session with error
        const session = await WhatsAppSession.findByUserId(userId);
        if (session) {
            await session.update({
                connection_status: "error",
                error_message: error.message
            });
        }
        
        return {
            success: false,
            error: error.message
        };
    }
};

exports.disconnectWhatsAppSession = async (userId) => {
    try {
        console.log(`Disconnecting WhatsApp session for user ${userId}`);
        
        const connection = activeConnections.get(userId);
        if (connection) {
            await connection.logout();
            activeConnections.delete(userId);
        }
        
        // Update session status
        const session = await WhatsAppSession.findByUserId(userId);
        if (session) {
            await session.update({
                connection_status: "disconnected",
                last_disconnected: new Date(),
                qr_code: null,
                qr_expires_at: null
            });
        }
        
        return {
            success: true
        };
        
    } catch (error) {
        console.error("Error disconnecting WhatsApp session:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

exports.getConnectionStatus = (userId) => {
    const connection = activeConnections.get(userId);
    return {
        isConnected: !!connection,
        connection: connection || null
    };
};

exports.refreshQRCode = async (userId) => {
    try {
        // Disconnect existing session if any
        await exports.disconnectWhatsAppSession(userId);
        
        // Initialize new session
        return await exports.initializeWhatsAppSession(userId);
    } catch (error) {
        console.error("Error refreshing QR code:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");
    
    // Add country code if not present (assuming +1 for US/Canada if no country code)
    if (!cleaned.startsWith("1") && cleaned.length === 10) {
        cleaned = "1" + cleaned;
    }
    
    // Add WhatsApp suffix
    return cleaned + "@s.whatsapp.net";
}

// Cleanup function to disconnect all sessions on app shutdown
exports.disconnectAllSessions = async () => {
    console.log("Disconnecting all WhatsApp sessions...");
    
    for (const [userId, connection] of activeConnections) {
        try {
            await connection.logout();
            console.log(`Disconnected session for user ${userId}`);
        } catch (error) {
            console.error(`Error disconnecting session for user ${userId}:`, error);
        }
    }
    
    activeConnections.clear();
};

// Auto-cleanup on process exit
process.on("SIGINT", exports.disconnectAllSessions);
process.on("SIGTERM", exports.disconnectAllSessions);

