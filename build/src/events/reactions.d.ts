import { ArgsOf, Client } from 'discordx';
export declare class Reactions {
    messageReact([reaction, user]: ArgsOf<'messageReactionAdd'>, bot: Client): Promise<void>;
    messageReactRemove([reaction, user]: ArgsOf<'messageReactionRemove'>, client: Client): Promise<void>;
}
