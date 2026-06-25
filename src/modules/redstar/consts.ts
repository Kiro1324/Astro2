import { Level } from "./types.js";

export const LEVEL = 10;

export const QUEUE_CHANNEL = "rs-queue";

export const RSJoinCommand = "rs-join";
export const Commands = { join: RSJoinCommand, leave: "rs-leave", config: "rs-config" } as const;

// levels are setup to be sortable with each drs level ranked higher than rs level
// this may not be ideal and we may instead want all drs levels higher than rs or some other sorting
export const RedStarLevels = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120] as const;
export const DarkStarLevels = [71, 81, 91, 101, 111, 121] as const;

// for convinience
export const AllLevels: Level[] = [30, 40, 50, 60, 70, 71, 80, 81, 90, 91, 100, 101, 110, 111, 120, 121] as const;
