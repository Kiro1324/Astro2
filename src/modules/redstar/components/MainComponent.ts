import {
    TextDisplayBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ContainerBuilder,
    SectionBuilder,
} from "discord.js";
import type { MessageActionRowComponentBuilder } from "discord.js";
import { Commands } from "../consts.js";
import { DarkStarLevels, RedStarLevels } from "../consts.js";
import type { User, CurrentQueue, DarkStarLevel, RedStarLevel, Level } from "../types.js";
import { isDarkStarQueue, isRedStarQueue, getCurrentQueues, getCustomId } from "../helpers.js";

/** builds the component of a given queue. this replaces the main component */
const buildQueueComponent = ({ level, users }: { level: Level; users: User[] }): ContainerBuilder => {
    const content = users.map((user) => `<t:${user.timestamp}:R> <@${user.userId}>`).join("\n");
    const customId = getCustomId(level);

    const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder({ content: `RS ${level}` }))
        .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Secondary).setLabel("+").setCustomId(customId));

    return (
        new ContainerBuilder()
            // higher level -> darker
            .setAccentColor([255 - 16 * level, 0, 0])
            .addSectionComponents(section)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
    );
};

/** this is the static set of buttons that should always be at the bottom of any queue */
const InteractionComponent = (): ContainerBuilder => {
    return new ContainerBuilder().addActionRowComponents(
        // TODO: need to figure out how exactly to use emojis
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Success)
                // .setLabel(":heavy_plus_sign:")
                .setEmoji({ name: ":heavy_plus_sign:" })
                .setCustomId(Commands.join),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Danger)
                // .setLabel(":heavy_multiplication_x:")
                .setEmoji({ name: ":heavy_multiplication_x:" })
                .setCustomId(Commands.leave),
            new ButtonBuilder().setStyle(ButtonStyle.Secondary).setDisabled(),
            new ButtonBuilder().setStyle(ButtonStyle.Secondary).setDisabled(),
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                // .setLabel(":gear:")
                .setEmoji({ name: ":gear:" })
                .setCustomId(Commands.config),
        ),
    );
};

const getPresortedQueues = <T extends RedStarLevel | DarkStarLevel>(levels: readonly T[]): Map<T, User[]> => {
    const queues = new Map<T, User[]>();
    levels.forEach((level) => queues.set(level, []));

    return queues;
};

const QueueComponents = <T extends RedStarLevel | DarkStarLevel, S extends CurrentQueue & { level: T }>(
    currentQueues: CurrentQueue[],
    levels: readonly T[],
    predicate: (value: CurrentQueue) => value is S,
): ContainerBuilder[] => {
    const components: ContainerBuilder[] = [];

    const map = getPresortedQueues(levels);

    currentQueues
        .filter((queue) => predicate(queue))
        .forEach(({ level, playerID, joinedTimestamp }) => {
            const user: User = { userId: playerID, timestamp: joinedTimestamp };
            const users = map.get(level) ?? [];
            users.push(user);
            map.set(level, users);
        });

    for (const [level, users] of map) {
        components.push(buildQueueComponent({ level, users }));
    }

    return components;
};

export const MainComponent = async (): Promise<ContainerBuilder[]> => {
    const component: ContainerBuilder[] = [];

    const currentQueues = await getCurrentQueues();

    component.push(...QueueComponents(currentQueues, DarkStarLevels, isDarkStarQueue));
    component.push(...QueueComponents(currentQueues, RedStarLevels, isRedStarQueue));

    component.push(InteractionComponent());

    return component;
};
