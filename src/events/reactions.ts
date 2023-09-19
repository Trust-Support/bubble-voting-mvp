import { ArgsOf, Client, Guard } from 'discordx';
import { Discord, On } from 'discordx';
import { sanity } from '../lib/sanity';
import fetchFull from '../guards/fetchFull';
import gateKeep from '../guards/gateKeep';
import { webhookClient } from '../lib/webhook';
import { ForumChannel, ThreadChannel } from 'discord.js';

@Discord()
export class Reactions {
  @On({ event: 'messageReactionAdd' })
  @Guard(fetchFull, gateKeep)
  async messageReact([reaction, user]: ArgsOf<'messageReactionAdd'>, bot: Client): Promise<void> {
    try {
      /*
        Filter channel and server wide reactions - check both for 
        channel ID and parent channel ID so we can use threads/forums
 
        Capture for council channel
      */
      if (reaction.message.channelId == process.env.COUNCIL_CHANNEL_ID ||
        (reaction?.message?.channel as ThreadChannel | ForumChannel)?.parentId == process.env.COUNCIL_CHANNEL_ID) {
        /*
          Access control should be defined on Discord-level with role permissions
          This is here mostly to make it explicit that higher-hierarchy roles
          will full admin privilleges cannot cast council votes :P

          Get Roles for user
        */
        const serverRoles = await (await bot.guilds.fetch(process.env.SERVER_ID as string)).roles.fetch();
        const modRole = serverRoles.find(({ name }) => name == process.env.COUNCIL_ROLE);
        const guildMember: any | null = await (await bot.guilds.fetch(process.env.SERVER_ID as string)).members.resolve(user.id);
        const isCouncilMemberReact = (await guildMember.fetch()).roles.resolve(modRole) !== null;

        if (!isCouncilMemberReact) {
          await reaction.remove();

          return
        }

        /* 
           Check if member record exists, create one if not
        */
        const member = await sanity.fetch(`*[_type=="member" && _id=="${user.id}"][0]`) ||
          await sanity.create({
            _type: 'member',
            _id: user.id,
            handle: user.username,
            balance: Number(process.env.COUNCIL_BUDGET)
          });

        const proposal = await sanity.fetch(`*[_type=="proposal" && _id=="${reaction.message.id}"][0]`)

        if (proposal == null) {
          throw new Error(`Proposal \`${reaction.message.id}\` not found.`);
        }

        const { balance: memberBalance } = member;

        /*
          Check if council member has enough votes left,
          bounce reaction if not
        */
        const isMemberSolvent = memberBalance > 0;

        if (!isMemberSolvent) {
          await reaction.remove();

          return
        }

        /*
          Mutate votes for given proposal +
          substract from council member's balance
        */
        const proposalPatch = await sanity
          .patch(reaction.message.id)
          .setIfMissing({votes: []})
          .append('votes', [{
            _key: `${user.id}:${reaction.emoji.id}`,
            emoji: `${reaction.emoji}`,
            author: user.id
          }]);

        const memberPatch = sanity
          .patch(user.id)
          .set({ balance: memberBalance - 1 });

        console.log(await sanity.transaction()
          .patch(proposalPatch)
          .patch(memberPatch)
          .commit({
            autoGenerateArrayKeys: false
          }));
        /* Serverwide capture */
      } else {
        /*
          Check threshold, check emoji +
          ensure we haven't already Bubbled this
        */
        if (reaction.count !== Number(process.env.SERVER_THRESHOLD) ||
          `${reaction.emoji}` !== process.env.SERVER_EMOJI ||
          await sanity.fetch(`*[_type=="proposal" && serverMessage=="${reaction.message.id}"][0]`) !== null
        ) {
          return
        }

        /* Take a snapshot of proposal in Sanity */
        const proposalCount = await sanity.fetch(`count(*[_type=="proposal"])`);

        const proposalTitle = `Proposal #${proposalCount + 1} by @${reaction?.message?.author?.username}`;
        const proposalContent = `${reaction.message.content}`;

        /* Pass to council forum */
        const webhookMessage = await webhookClient.send({
          threadName: proposalTitle,
          content: proposalContent +
            `\n\n▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞▝▞\nReposted from: ${reaction.message.url}`
        });

        const proposal = await sanity.create({
          _type: 'proposal',
          _id: webhookMessage.id,
          title: proposalTitle,
          author: reaction?.message?.author?.id,
          serverMessage: `https://discord.com/channels/${reaction.message.guildId}/${reaction.message.channelId}/${reaction.message.id}`,
          councilMessage: `https://discord.com/channels/${reaction.message.guildId}/${process.env.COUNCIL_CHANNEL_ID}/threads/${webhookMessage.id}`,
          content: proposalContent
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  @On({ event: 'messageReactionRemove' })
  @Guard(fetchFull, gateKeep)
  async messageReactRemove([reaction, user]: ArgsOf<'messageReactionRemove'>, client: Client): Promise<void> {
    try {
      /*
        Filter channel and server wide reactions - check both for 
        channelId + parent channel ID for forum channels
        Capture for council channel
      */
      if (reaction.message.channelId == process.env.COUNCIL_CHANNEL_ID ||
        (reaction?.message?.channel as ThreadChannel | ForumChannel)?.parentId == process.env.COUNCIL_CHANNEL_ID) {
        /* 
           Check if member record exists, create one if not
        */
        const member = await sanity.fetch(`*[_type=="member" && _id=="${user.id}"][0]`) ||
          await sanity.create({
            _type: 'member',
            _id: user.id,
            handle: user.username,
            balance: Number(process.env.COUNCIL_BUDGET)
          });

        const { balance: memberBalance } = member;

        /*
          Mutate votes for given proposal +
          return vote back to council member's balance
        */
        const proposalPatch = sanity
          .patch(reaction.message.id)
          .unset([`votes[_key=="${user.id}:${reaction.emoji.id}"]`]);

        const memberPatch = sanity
          .patch(user.id)
          .set({
            balance: memberBalance < Number(process.env.COUNCIL_BUDGET) ?
              memberBalance + 1 :
              Number(process.env.COUNCIL_BUDGET)
          });

        await sanity
          .transaction()
          .patch(memberPatch)
          .patch(proposalPatch)
          .commit();
      }
    } catch (err) {
      console.error(err);
    }
  }
}
