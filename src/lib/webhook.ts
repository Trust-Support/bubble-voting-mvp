import { type Message, WebhookClient, APIMessage } from 'discord.js';

export const webhookClient = new WebhookClient({
    url: process.env.WEBHOOK_URL as string
});

export const sendWebhookProposal = async (title: string, message: Message): Promise<APIMessage> =>
    await webhookClient.send({
        threadName: `Proposal ${title} by @${message?.author?.username}`,
        content: `${message.content}\n\n▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞\nReposted from: ${message.url}`
    })