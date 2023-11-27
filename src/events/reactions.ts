import { Message, type GuildChannel, MessageReaction, ForumChannel, DMChannel, User, APIMessageActionRowComponent } from 'discord.js';
import { ArgsOf, Client, Guard, Discord, On } from 'discordx';
import { sanity, createProposal, submitVote, removeVote, fetchMember, createMember, cookVoteKey } from '../lib/sanity';
import fetchFull from '../guards/fetchFull';
import gateKeep from '../guards/gateKeep';
import { sendWebhookProposal } from '../lib/webhook';
import { predict } from '../lib/openai';
import emojiRegex from 'emoji-regex';

@Discord()
export class Reactions {
  /*
  ----------------------------------------
    Serverwide emoji add capture
  ----------------------------------------
  */
  @On({ event: 'messageReactionAdd' })
  @Guard(fetchFull)
  async serverlMessageReact(
    [messageReaction, interactionAuthor]: ArgsOf<'messageReactionAdd'>,
    bot: Client
  ): Promise<void> {
    try {
      const parentChannelId = (messageReaction?.message?.channel as GuildChannel)?.parentId;
      const sanityMatch = await sanity.fetch(`*[_type=="proposal" && serverMessage=="${messageReaction.message.url}"][0]`);
      const hasSanityMatch = sanityMatch != null; 

      /* Check threshold, check emoji + ensure we haven't already Bubbled this */
      if (messageReaction.count !== Number(process.env.SERVER_THRESHOLD) ||
        `${messageReaction.emoji}` !== process.env.SERVER_EMOJI ||
        parentChannelId == process.env.COUNCIL_CHANNEL_ID ||
        hasSanityMatch
      ) {
        return
      }

      /* Dispatch webhook + take snapshot in Sanity */
      const prediction = await predict(`translate given proposal into 4 emojis: "${messageReaction.message.content}"`);

      const title = !messageReaction?.message?.content?.length || !prediction ? `#${messageReaction?.message?.createdTimestamp}` : prediction.slice(0, 5);

      const webhookMessage = await sendWebhookProposal(title, (messageReaction?.message?.length > 2000 ? `${messageReaction?.message?.substring(0, 1500)}...` : messageReaction?.message) as Message);

      const sanityProposal = await createProposal(title, webhookMessage as any, messageReaction?.message as Message);
    } catch (err) {
      console.error(err);
    }
  }

  /*
  ----------------------------------------
    Council emoji add capture
  ----------------------------------------
  */
  @On({ event: 'messageReactionAdd' })
  @Guard(fetchFull, gateKeep)
  async councilMessageReact(
    [messageReaction, interactionAuthor]: ArgsOf<'messageReactionAdd'>,
    bot: Client
  ): Promise<void> {
    try {
      let member = await fetchMember(interactionAuthor.id);

      if (!member) {
        member = await createMember(interactionAuthor as User);
      }

      console.log(member);

      const isMemberSolvent = member.balance > 0;

      if (!isMemberSolvent || process.env.VOTING_DISABLED) {
        const { id: emojiId } = messageReaction.emoji;
        const reaction = await messageReaction.message.reactions.resolve(`${messageReaction.emoji.id}`) as MessageReaction;

        if (!!reaction) {
          console.log(await reaction.users.remove(interactionAuthor.id));
        }

        return
      }

      await submitVote(messageReaction as MessageReaction, interactionAuthor as User);
    } catch (err) {
      console.error(err);
    }
  }

  /*
  ----------------------------------------
    Council emoji remove capture
  ----------------------------------------
  */
  @On({ event: 'messageReactionRemove' })
  @Guard(fetchFull, gateKeep)
  async councilMessageReactRemove(
    [messageReaction, interactionAuthor]: ArgsOf<'messageReactionRemove'>,
    client: Client,
  ): Promise<void> {
    try {
      await removeVote(messageReaction as MessageReaction, interactionAuthor as User);
    } catch (err) {
      console.error(err);
    }
  }
}
