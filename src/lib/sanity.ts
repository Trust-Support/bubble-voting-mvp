import { createClient } from '@sanity/client'
import { APIMessage, Message, MessageReaction, Snowflake, User, messageLink } from 'discord.js';

export const sanity = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_TOKEN,
    useCdn: false,
    apiVersion: '2023-09-14'
});

export const cookVoteKey = (reaction: MessageReaction, user: User) => 
    `${reaction.message.id}:${user.id}:${reaction.emoji.id}`

export const fetchMember = async (memberId: Snowflake) => 
    await sanity.fetch(`*[_type=="member" && _id=="${memberId}"][0]`);

export const createMember = async (user: User) =>
    await sanity.create({
        _type: 'member',
        _id: user.id,
        username: user.username
    });

export const createProposal = async (
    title: string,
    councilMessage: APIMessage,
    serverMessage: Message
) => {
    console.log(title);
    console.log(councilMessage);

    return await sanity.create({
        _type: 'proposal',
        _id: councilMessage.id,
        title: title,
        author: councilMessage.author.id,
        content: councilMessage.content,
        serverMessage: serverMessage.url,
        councilMessage: `https://discord.com/channels/${process.env.SERVER_ID}/${councilMessage.channel_id}/threads/${councilMessage.id}`
    });
}

export const submitVote = async (
    councilMessageReaction: MessageReaction,
    user: User
) => {
    const { balance: { balance }, votes } = await sanity.fetch(`{
        "balance": *[_type=="member" && _id=="${user.id}"]{balance}[0],
        "votes": *[_type=="proposal" && _id=="${councilMessageReaction.message.id}"]{votes}[0]
    }`)

    //console.log(await sanity.delete({
    //    query: `*[_type == "proposal"]`
    //}));

    await sanity
        .transaction()
        .patch(user.id, p => 
            p.set({ balance: balance - 1 })
        )
        .patch(councilMessageReaction.message.id, p =>
            p.setIfMissing({ votes: [] })
                .append('votes', [{
                    author: {
                        _ref: user.id,
                        _type: 'member'
                    },
                    emoji: councilMessageReaction.emoji.toString(),
                    _key: cookVoteKey(councilMessageReaction, user)
                }])
        )
        .commit({ autoGenerateArrayKeys: false });
}

export const removeVote = async (
    councilMessageReaction: MessageReaction,
    user: User
) => {
    const { balance: { balance }, votes } = await sanity.fetch(`{
        "balance": *[_type=="member" && _id=="${user.id}"]{balance}[0],
        "votes": *[_type=="proposal" && _id=="${councilMessageReaction.message.id}"]{votes}[0]
    }`)

    console.log(await sanity
        .transaction()
        .patch(user.id, p =>
            p.set({ balance: balance + 1 })
        )
        .patch(councilMessageReaction.message.id, p =>
            p.setIfMissing({ votes: [] })
                .unset([`votes[_key=="${cookVoteKey(councilMessageReaction, user)}"]`])
        )
        .commit({ autoGenerateArrayKeys: false }));
    }
