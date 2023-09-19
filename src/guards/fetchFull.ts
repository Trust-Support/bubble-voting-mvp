import { type Client, type MessageReaction } from 'discord.js'
import { GuardFunction, ArgsOf, Next } from 'discordx'

export default async function fetchFull(
    [messageReaction]: ArgsOf<'messageReactionAdd'> | ArgsOf<'messageReactionRemove'>,
    client: Client,
    next: Next
): Promise<void> {
    try {
        /* Ensure we have full reaction data */
        if (messageReaction?.partial) {
            await messageReaction.fetch();
        }

        /* Ensure we have full message data */
        //if (messageReaction.message?.partial) {
            await messageReaction.message.fetch();
        //}

        await next();
    } catch (err) {
        console.error(err);
    }
}
