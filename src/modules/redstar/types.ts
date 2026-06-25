import type { ButtonInteraction, CacheType } from "discord.js";
import { Commands, DarkStarLevels, RedStarLevels, RSJoinCommand } from "./consts.js";

export type RedStarLevel = (typeof RedStarLevels)[number];
export type DarkStarLevel = (typeof DarkStarLevels)[number];
export type Level = RedStarLevel | DarkStarLevel;

export type JoinCommands = `${typeof RSJoinCommand}-${Level}`;
export type CommandsType = (typeof Commands)[keyof typeof Commands] | JoinCommands;

export type ButtonHandler = (interaction: ButtonInteraction<CacheType>) => Promise<void>;

export type CurrentQueue = {
    level: number;
    playerID: string;
    lastseenTimestamp: number;
    joinedTimestamp: number;
    type: number;
    AFKwarned: number;
    dark: number;
};

export type DarkStarQueue = CurrentQueue & { level: DarkStarLevel; dark: 1 };
export type RedStarQueue = CurrentQueue & { level: RedStarLevel; dark: 0 };

// TODO: queues should have join timestamps while the user should have the afk timestamp
export type User = { userId: string; timestamp: number; queues?: Level[] };
