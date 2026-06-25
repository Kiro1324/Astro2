import { query } from "../pool.js";
import { boolToInt } from "../utils.js";
import { DarkStarLevels, LEVEL, RedStarLevels, RSJoinCommand } from "./consts.js";
import type { CurrentQueue, JoinCommands, RedStarLevel, DarkStarLevel, DarkStarQueue, RedStarQueue } from "./types.js";

export const getCurrentQueue = async ({
    level,
    dark,
}: {
    level: RedStarLevel | DarkStarLevel;
    dark: boolean;
}): Promise<CurrentQueue[]> => {
    const lvl = Math.floor(level / LEVEL);
    const [result] = await query<CurrentQueue>(
        `SELECT level, playerID, lastseenTimestamp, joinedTimestamp, type, AFKwarned, dark FROM rsqueueuser WHERE level = ${lvl} AND dark = ${boolToInt(dark)}`,
    );

    return result;
};

export const fromRawLevel = (level: number, dark: boolean): number => {
    if (dark) {
        return level * LEVEL + 1;
    }
    return level * LEVEL;
};

export const getCurrentQueues = async (): Promise<CurrentQueue[]> => {
    const [result] = await query<CurrentQueue>(
        `SELECT level, playerID, lastseenTimestamp, joinedTimestamp, type, AFKwarned, dark FROM rsqueueuser`,
    );

    return result.map((x) => ({ ...x, level: fromRawLevel(x.level, x.dark === 1) }));
};

const getPlayerQueues = async (playerID: string) => {
    const [result] = await query<{ level: number; dark: number }>(
        `SELECT level, dark FROM rsqueueuser WHERE playerID = ${playerID} AND type = 0`,
    );
};

export const getCustomId = (level: RedStarLevel | DarkStarLevel): JoinCommands => {
    return `${RSJoinCommand}-${level}`;
};

export const isRestrictedArray = <T extends number>(arr: readonly T[]): ((num: number) => num is T) => {
    return (num: number): num is T => arr.findIndex((val) => val === num) !== -1;
};

export const isRedStarLevel = isRestrictedArray(RedStarLevels);
export const isDarkStarLevel = isRestrictedArray(DarkStarLevels);

export const isRedStarQueue = (queue: CurrentQueue): queue is RedStarQueue => {
    return queue.dark === 0 && isRedStarLevel(queue.level);
};
export const isDarkStarQueue = (queue: CurrentQueue): queue is DarkStarQueue => {
    return queue.dark === 1 && isDarkStarLevel(queue.level);
};
