const { Message, MessageTemplate, User, Subscription } = require("../models");
const whatsappService = require("./whatsappService");

class NotificationService {
    /**
     * Send a notification with subscription limit checking
     */
    static async sendNotification(userId, orderData, eventType = "order_created") {
        try {
            console.log(`📱 Processing notification for user ${userId}, event: ${eventType}`);
            
            // Check user's subscription and limits
            const canSend = await this.checkSubscriptionLimits(userId);
            if (!canSend.allowed) {
                console.log(`❌ Notification blocked: ${canSend.reason}`);
                return {
                    success: false,
                    error: canSend.reason,
                    blocked: true
                };
            }
            
            // Get user's message template for this event type
            const template = await MessageTemplate.findOne({
                where: {
                    user_id: userId,
                    event_type: eventType,
                    is_active: true
                }
            });
            
            if (!template) {
                console.log(`⚠️ No active template found for event: ${eventType}`);
                return {
                    success: false,
                    error: "No active message template found for this event type"
                };
            }
            
            // Generate message content from template
            const messageContent = this.generateMessageFromTemplate(template.content, orderData);
            
            // Get customer phone number from order data
            const customerPhone = this.extractPhoneNumber(orderData);
            if (!customerPhone) {
                console.log(`❌ No valid phone number found in order data`);
                return {
                    success: false,
                    error: "No valid customer phone number found"
                };
            }
            
            // Send WhatsApp message
            const whatsappResult = await whatsappService.sendMessage(userId, customerPhone, messageContent);
            
            if (!whatsappResult.success) {
                console.log(`❌ WhatsApp send failed: ${whatsappResult.error}`);
                return whatsappResult;
            }
            
            // Create message record
            const message = await Message.create({
                user_id: userId,
                order_id: orderData.id || null,
                template_id: template.id,
                recipient_phone: customerPhone,
                message_content: messageContent,
                delivery_status: "sent",
                whatsapp_message_id: whatsappResult.messageId,
                event_type: eventType,
                sent_at: new Date()
            });
            
            // Increment user's subscription usage
            await this.incrementUsage(userId);
            
            console.log(`✅ Notification sent successfully. Message ID: ${message.id}`);
            
            return {
                success: true,
                messageId: message.id,
                whatsappMessageId: whatsappResult.messageId,
                content: messageContent,
                recipient: customerPhone
            };
            
        } catch (error) {
            console.error("❌ Error sending notification:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check if user can send messages based on subscription limits
     */
    static async checkSubscriptionLimits(userId) {
        try {
            const subscription = await Subscription.findByUserId(userId);
            
            if (!subscription) {
                return {
                    allowed: false,
                    reason: "No active subscription found"
                };
            }
            
            if (!subscription.isActive()) {
                return {
                    allowed: false,
                    reason: "Subscription is not active or has expired"
                };
            }
            
            if (subscription.hasReachedLimit()) {
                return {
                    allowed: false,
                    reason: `Monthly limit of ${subscription.monthly_limit} messages reached`
                };
            }
            
            return {
                allowed: true,
                remaining: subscription.getRemainingMessages(),
                limit: subscription.monthly_limit,
                used: subscription.current_usage
            };
            
        } catch (error) {
            console.error("Error checking subscription limits:", error);
            return {
                allowed: false,
                reason: "Error checking subscription status"
            };
        }
    }
    
    /**
     * Increment user's message usage count
     */
    static async incrementUsage(userId, count = 1) {
        try {
            const subscription = await Subscription.findByUserId(userId);
            if (subscription) {
                await subscription.incrementUsage(count);
                console.log(`📊 Usage incremented for user ${userId}: ${subscription.current_usage}/${subscription.monthly_limit}`);
            }
        } catch (error) {
            console.error("Error incrementing usage:", error);
        }
    }
    
    /**
     * Generate message content from template with order data
     */
    static generateMessageFromTemplate(templateContent, orderData) {
        let message = templateContent;
        
        // Replace common placeholders
        const replacements = {
            "{{customer_name}}": orderData.customer?.first_name || "Customer",
            "{{customer_full_name}}": orderData.customer ? 
                `${orderData.customer.first_name} ${orderData.customer.last_name}`.trim() : "Customer",
            "{{order_number}}": orderData.order_number || orderData.name || "N/A",
            "{{order_total}}": orderData.total_price || "0.00",
            "{{currency}}": orderData.currency || "USD",
            "{{order_date}}": orderData.created_at ? 
                new Date(orderData.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
            "{{store_name}}": orderData.shop_name || "Store",
            "{{tracking_number}}": orderData.tracking_number || "N/A",
            "{{shipping_address}}": this.formatShippingAddress(orderData.shipping_address),
            "{{items_count}}": orderData.line_items?.length || 0,
            "{{items_list}}": this.formatItemsList(orderData.line_items)
        };
        
        // Replace all placeholders
        for (const [placeholder, value] of Object.entries(replacements)) {
            message = message.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
        }
        
        return message;
    }
    
    /**
     * Extract and format phone number from order data
     */
    static extractPhoneNumber(orderData) {
        let phone = null;
        
        // Try different phone number fields
        if (orderData.customer?.phone) {
            phone = orderData.customer.phone;
        } else if (orderData.shipping_address?.phone) {
            phone = orderData.shipping_address.phone;
        } else if (orderData.billing_address?.phone) {
            phone = orderData.billing_address.phone;
        }
        
        if (!phone) return null;
        
        // Clean and format phone number
        phone = phone.replace(/[^\d+]/g, "");
        
        // Add country code if missing (assuming US/Canada for now)
        if (!phone.startsWith("+")) {
            if (phone.length === 10) {
                phone = "+1" + phone;
            } else if (phone.length === 11 && phone.startsWith("1")) {
                phone = "+" + phone;
            }
        }
        
        return phone;
    }
    
    /**
     * Format shipping address for message
     */
    static formatShippingAddress(address) {
        if (!address) return "N/A";
        
        const parts = [
            address.address1,
            address.address2,
            address.city,
            address.province,
            address.zip,
            address.country
        ].filter(Boolean);
        
        return parts.join(", ");
    }
    
    /**
     * Format items list for message
     */
    static formatItemsList(items) {
        if (!items || !Array.isArray(items)) return "N/A";
        
        return items.map(item => 
            `${item.quantity}x ${item.title || item.name}`
        ).join(", ");
    }
    
    /**
     * Get notification statistics for a user
     */
    static async getNotificationStats(userId, period = "month") {
        try {
            const now = new Date();
            let startDate;
            
            switch (period) {
                case "day":
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case "week":
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case "month":
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            
            const { Op } = require("sequelize");
            const { sequelize } = require("../config/database");
            
            const stats = await Message.findAll({
                attributes: [
                    "delivery_status",
                    [sequelize.fn("COUNT", sequelize.col("id")), "count"]
                ],
                where: {
                    user_id: userId,
                    created_at: {
                        [Op.gte]: startDate
                    }
                },
                group: ["delivery_status"]
            });
            
            const result = {
                period,
                startDate,
                endDate: now,
                total: 0,
                sent: 0,
                delivered: 0,
                failed: 0,
                pending: 0
            };
            
            stats.forEach(stat => {
                const status = stat.getDataValue("delivery_status");
                const count = parseInt(stat.getDataValue("count"));
                result.total += count;
                result[status] = count;
            });
            
            return result;
            
        } catch (error) {
            console.error("Error getting notification stats:", error);
            throw error;
        }
    }
}

module.exports = NotificationService;

