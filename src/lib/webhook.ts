import { type Message, WebhookClient, APIMessage } from 'discord.js';
import { TypeOf } from 'zod';

export const webhookClient = new WebhookClient({
    url: process.env.WEBHOOK_URL as string
});

export const sendWebhookProposal = async (title: string, message: Message) => {
    try {
        /* Extract attachments */
        const attachments = [
            ...message.embeds.map(({ url }) => url),
            ...[...message.attachments.values()].map(({ url }) => url)
        ];

        return await webhookClient.send({
            threadName: `Proposal ${title} by @${message?.author?.username}`,
            content: `${message.content}\n${attachments.join(' ')}\n\n▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞\nReposted from: ${message.url}`
        })
    } catch (err) {
        console.error(err);
    }
}