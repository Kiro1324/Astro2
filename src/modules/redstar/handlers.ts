import { MessageFlags } from "discord.js";
import type { DMChannel, NonThreadGuildBasedChannel } from "discord.js";
import { MainComponent } from "./components/MainComponent.js";
import { QUEUE_CHANNEL } from "./consts.js";

// on channel create/update, check if it's the "rs-queue" and if it is, send the main component to it
export const channelCreateHandler = async (channel: DMChannel | NonThreadGuildBasedChannel): Promise<void> => {
    if (channel.isDMBased()) return;
    if (!channel.isSendable()) return;
    if (channel.name !== QUEUE_CHANNEL) return;

    const components = await MainComponent();

    channel.send({
        components,
        flags: MessageFlags.IsComponentsV2,
    });
};

export const channelUpdateHandler = async (
    _: unknown,
    newChannel: DMChannel | NonThreadGuildBasedChannel,
): Promise<void> => {
    channelCreateHandler(newChannel);
};
