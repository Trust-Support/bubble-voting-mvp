import { type Client, type MessageReaction } from 'discord.js'
import { GuardFunction, ArgsOf, Next } from 'discordx'

export default async function gateKeep(
    [messageReaction]: ArgsOf<'messageReactionAdd'> | ArgsOf<'messageReactionRemove'>,
    client: Client,
    next: Next
): Promise<void> {
    /* Enable for specified server only */
    if (messageReaction.message.guildId !== process.env.SERVER_ID) {
        return
    } else {
        await next();
    }
}
