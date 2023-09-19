import { WebhookClient } from 'discord.js';
export const webhookClient = new WebhookClient({
    url: process.env.WEBHOOK_URL
});
