import { TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ContainerBuilder } from "discord.js";
import type { MessageActionRowComponentBuilder } from "discord.js";
import { AllLevels, LEVEL, RSJoinCommand } from "../consts.js";
import type { JoinCommands, Level } from "../types.js";

const BUTTONS_PER_ROW = 5;

/** this is the ephemeral component that shows buttons to users based on their rs level */
export const JoinComponent = (level: Level): ContainerBuilder[] => {
    const buttons: ButtonBuilder[] = [];

    const idx = AllLevels.findIndex((lvl) => lvl === level);
    AllLevels.slice(idx, idx + BUTTONS_PER_ROW)
        .reverse()
        .forEach((lvl) => {
            const commandId: JoinCommands = `${RSJoinCommand}-${lvl}`;
            const dark = lvl % LEVEL === 1;

            buttons.push(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Success)
                    .setLabel(dark ? `DRS ${lvl}` : `RS ${lvl}`)
                    .setEmoji({ name: dark ? ":8RedStar:" : ":8YellowStar:" })
                    .setCustomId(commandId),
            );
        });

    const descriptionComponent = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder({ content: "placeholder text to see what this looks like in action" }),
    );

    const selectionComponent = new ContainerBuilder().addActionRowComponents(
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(buttons),
    );

    return [descriptionComponent, selectionComponent];
};
