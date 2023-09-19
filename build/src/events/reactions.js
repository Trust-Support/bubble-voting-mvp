var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Client, Guard } from 'discordx';
import { Discord, On } from 'discordx';
import { sanity } from '../lib/sanity';
import fetchFull from '../guards/fetchFull';
import gateKeep from '../guards/gateKeep';
import { webhookClient } from '../lib/webhook';
let Reactions = class Reactions {
    async messageReact([reaction, user], bot) {
        try {
            /*
              Filter channel and server wide reactions - check both for
              channel ID and parent channel ID so we can use threads/forums
       
              Capture for council channel
            */
            if (reaction.message.channelId == process.env.COUNCIL_CHANNEL_ID ||
                reaction?.message?.channel?.parentId == process.env.COUNCIL_CHANNEL_ID) {
                /*
                  Access control should be defined on Discord-level with role permissions
                  This is here mostly to make it explicit that higher-hierarchy roles
                  will full admin privilleges cannot cast council votes :P
        
                  Get Roles for user
                */
                const serverRoles = await (await bot.guilds.fetch(process.env.SERVER_ID)).roles.fetch();
                const modRole = serverRoles.find(({ name }) => name == process.env.COUNCIL_ROLE);
                const guildMember = await (await bot.guilds.fetch(process.env.SERVER_ID)).members.resolve(user.id);
                const isCouncilMemberReact = (await guildMember.fetch()).roles.resolve(modRole) !== null;
                if (!isCouncilMemberReact) {
                    await reaction.remove();
                    return;
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
                const proposal = await sanity.fetch(`*[_type=="proposal" && _id=="${reaction.message.id}"][0]`);
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
                    return;
                }
                /*
                  Mutate votes for given proposal +
                  substract from council member's balance
                */
                const proposalPatch = await sanity
                    .patch(reaction.message.id)
                    .setIfMissing({ votes: [] })
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
            }
            else {
                /*
                  Check threshold, check emoji +
                  ensure we haven't already Bubbled this
                */
                if (reaction.count !== Number(process.env.SERVER_THRESHOLD) ||
                    `${reaction.emoji}` !== process.env.SERVER_EMOJI ||
                    await sanity.fetch(`*[_type=="proposal" && serverMessage=="${reaction.message.id}"][0]`) !== null) {
                    return;
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
        }
        catch (err) {
            console.error(err);
        }
    }
    async messageReactRemove([reaction, user], client) {
        try {
            /*
              Filter channel and server wide reactions - check both for
              channelId + parent channel ID for forum channels
              Capture for council channel
            */
            if (reaction.message.channelId == process.env.COUNCIL_CHANNEL_ID ||
                reaction?.message?.channel?.parentId == process.env.COUNCIL_CHANNEL_ID) {
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
        }
        catch (err) {
            console.error(err);
        }
    }
};
__decorate([
    On({ event: 'messageReactionAdd' }),
    Guard(fetchFull, gateKeep),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Client]),
    __metadata("design:returntype", Promise)
], Reactions.prototype, "messageReact", null);
__decorate([
    On({ event: 'messageReactionRemove' }),
    Guard(fetchFull, gateKeep),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Client]),
    __metadata("design:returntype", Promise)
], Reactions.prototype, "messageReactRemove", null);
Reactions = __decorate([
    Discord()
], Reactions);
export { Reactions };
