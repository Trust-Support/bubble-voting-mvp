import { type Client } from 'discord.js';
import { ArgsOf, Next } from 'discordx';
export default function gateKeep([reaction]: ArgsOf<'messageReactionAdd'> | ArgsOf<'messageReactionRemove'>, client: Client, next: Next): Promise<void>;
