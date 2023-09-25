import { ArgsOf, Client, Guard } from 'discordx';
import { Discord, On } from 'discordx';
import { sanity, createProposal, submitVote, removeVote, fetchMember } from '../lib/sanity';
import fetchFull from '../guards/fetchFull';
import gateKeep from '../guards/gateKeep';
import { sendWebhookProposal } from '../lib/webhook';
import { predict } from '../lib/openai';

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
      /* Check threshold, check emoji + ensure we haven't already Bubbled this */
      if (messageReaction.count !== Number(process.env.SERVER_THRESHOLD) ||
        `${messageReaction.emoji}` !== process.env.SERVER_EMOJI ||
          messageReaction?.message?.channel?.parentId == process.env.COUNCIL_CHANNEL_ID ||
          await sanity.fetch(`*[_type=="proposal" && serverMessage=="${messageReaction.message.id}"][0]`
      ) !== null
      ) {
        return
      }
 
      /* Dispatch webhook + take snapshot in Sanity */
      const title = (await predict(`translate given proposal into 4 emojis: "${messageReaction.message.content}"`));
      const webhookMessage = await sendWebhookProposal(title, messageReaction?.message);
      const sanityProposal = await createProposal(title, webhookMessage, messageReaction?.message);
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
      // TODO: fetch balance only if possible
      const member = await fetchMember(interactionAuthor.id);

      const isMemberSolvent = member.balance > 0;

      if (!isMemberSolvent) {
        await messageReaction.remove();

        return
      }

      await submitVote(messageReaction, interactionAuthor);
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
      await removeVote(messageReaction, interactionAuthor);
    } catch (err) {
      console.error(err);
    }
  }
}
