import { GuildChannel, type Client, type MessageReaction } from 'discord.js'
import { GuardFunction, ArgsOf, Next } from 'discordx'
import { ThreadChannel, ForumChannel } from 'discord.js';

export default async function gateKeep(
    [messageReaction, interactionAuthor]: ArgsOf<'messageReactionAdd'> | ArgsOf<'messageReactionRemove'>,
    bot: Client,
    next: Next
): Promise<void> {
    /* Ignore for non-council channels */
    const parentChannelId = (messageReaction?.message?.channel as GuildChannel)?.parentId

    const isCouncilChannel = messageReaction.message.channelId == process.env.COUNCIL_CHANNEL_ID ||
        parentChannelId == process.env.COUNCIL_CHANNEL_ID;

    if (!isCouncilChannel) {
        return
    }

    /*
       Access control should be defined on Discord-level with role permissions
       This is here mostly to make it explicit that higher-hierarchy roles
       will full admin privilleges cannot cast council votes :P
   
       Get and verify roles for user
    */
    const guildMember: any | null = await (await bot.guilds.fetch(process.env.SERVER_ID as string)).members.resolve(interactionAuthor.id);
    const isCouncilMemberReact = (await guildMember.fetch()).roles.resolve(process.env.COUNCIL_ROLE) !== null;

    if (!isCouncilMemberReact) {
        const { id: emojiId } = messageReaction.emoji;
        const reaction = await messageReaction.message.reactions.resolve(`${messageReaction.emoji.id}`) as MessageReaction;

        if (!!reaction) {
            console.log(await reaction.users.remove(interactionAuthor.id));
        }

        return
    } else {
        await next();
    }
}
