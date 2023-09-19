export default async function gateKeep([reaction], client, next) {
    /* Enable for specified server only */
    if (reaction.message.guildId !== process.env.SERVER_ID) {
        return;
    }
    else {
        await next();
    }
}
