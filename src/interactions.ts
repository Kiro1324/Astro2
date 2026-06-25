import type { ButtonInteraction, CacheType, ChatInputCommandInteraction, Interaction } from "discord.js";
import { fetchMember, sendMessage } from "./bot.js";
import { queryDB } from "./modules/DB.js";
import { handleVerify, handleReject, handleVoid, handleLog, handleSolo, handleRun } from "./modules/event.js";
import { handleRecap } from "./modules/whitestar.js";
import { adminRole, recapchannel, rseventlogchannel, scorekeeperrole } from "../config/config.js";
import { commands } from "./modules/redstar/commands.js";

const handleButtonInteraction = async (interaction: ButtonInteraction<CacheType>): Promise<void> => {
    const handler = commands[interaction.customId];
    if (handler !== undefined) {
        return handler(interaction);
    }

    const member = await fetchMember(interaction.user.id);
    if (member.roles.cache.some((role) => role.id === scorekeeperrole || role.id === adminRole)) {
        const d = Date.now();
        interaction
            .deferReply({ ephemeral: true })
            .then(() => {
                if (interaction.customId === "verify") {
                    handleVerify(interaction);
                } else if (interaction.customId === "reject") {
                    handleReject(interaction);
                } else if (interaction.customId === "void") {
                    handleVoid(interaction);
                }
            })
            .catch((err) => {
                console.log(err);
                sendMessage(
                    interaction.channelId,
                    `<@${interaction.user.id}> unfortunately, a critical latency error occured while processing this request. Please click the button again.`,
                );
            });
    } else {
        interaction.reply({
            content: "You do not have the necessary permission to use this command",
            ephemeral: true,
        });
    }
};

const handleChatInteraction = async (interaction: ChatInputCommandInteraction<CacheType>): Promise<void> => {
    let func: (interaction: ChatInputCommandInteraction) => void = (interaction: ChatInputCommandInteraction) => {};
    let eventcommand = false;
    let recapcommand = false;
    switch (interaction.commandName) {
        case "log":
            func = handleLog;
            eventcommand = true;
            break;
        case "solo":
            func = handleSolo;
            eventcommand = true;
            break;
        case "run":
            func = handleRun;
            eventcommand = true;
            break;
        case "recap":
            func = handleRecap;
            recapcommand = true;
            break;
    }

    //Channel restrictions based on command type
    if (eventcommand) {
        queryDB("SELECT event FROM config").then((event) => {
            if (event[0].event !== 0) {
                if (interaction.channelId !== rseventlogchannel)
                    interaction.reply({
                        content: `This is not the correct channel for this command. Use <#${rseventlogchannel}>`,
                        ephemeral: true,
                    });
                else {
                    interaction
                        .deferReply()
                        .then(() => {
                            func(interaction);
                        })
                        .catch((err) => {
                            sendMessage(
                                interaction.channelId,
                                `<@${interaction.user.id}> unfortunately, a critical latency error occured while processing this request. Please resubmit the entire command.`,
                            );
                        });
                }
            } else if (interaction.isRepliable()) {
                interaction.reply({
                    content: "There is no ongoing RS Event at the moment, all related commands have been disabled.",
                    ephemeral: true,
                });
            }
        });
    } else if (recapcommand) {
        if (interaction.channelId !== recapchannel)
            interaction.reply({
                content: `This is not the correct channel for this command. Use <#${recapchannel}>`,
                ephemeral: true,
            });
        else func(interaction);
    }
};

export const interactionHandler = async (interaction: Interaction<CacheType>): Promise<void> => {
    if (interaction.isButton()) {
        return handleButtonInteraction(interaction);
    }

    if (interaction.isChatInputCommand()) {
        handleChatInteraction(interaction);
    }
};
