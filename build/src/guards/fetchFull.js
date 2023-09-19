export default async function fetchFull([reaction], client, next) {
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
    }
    catch (err) {
        console.error(err);
    }
}
