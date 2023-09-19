import { type Client, type MessageReaction } from 'discord.js'
import { GuardFunction, ArgsOf, Next } from 'discordx'

export default async function fetchFull(
    [reaction]: ArgsOf<'messageReactionAdd'> | ArgsOf<'messageReactionRemove'>,
    client: Client,
    next: Next
): Promise<void> {
    try {
        /* Ensure we have full reaction data */
        if (reaction?.partial) {
            await reaction.fetch();
        }

        /* Ensure we have full message data */
        //if (messageReaction.message?.partial) {
            await reaction.message.fetch();
        //}

        await next();
    } catch (err) {
        console.error(err);
    }
}
