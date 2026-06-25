import { Client, GatewayIntentBits, EmbedBuilder, Guild, Message, GuildMember, Role, ColorResolvable, MessageReaction, User, Colors, Collection, GuildTextBasedChannel, Routes, REST, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction, PartialMessage, Events } from 'discord.js';
import { GreeterRole, SFAcorp, auditlogchannel, logchannel, prefix, representativerole, welcomechannel } from '../config/config.js';
import { autoresponsecheck } from './modules/autoresponse.js';
import { commandGroup } from './modules/command.js';
import { initDB, queryDB } from "./modules/DB.js"
import { initHelp } from './modules/help.js';
import { initAFKTimeoutCheckLoop, initRS } from './modules/redstar.js';
import { channelCreateHandler, channelUpdateHandler } from './modules/redstar/handlers.js';
import { initstats } from './modules/stats.js';
import { initRole } from './modules/role.js';
import { initUser } from './modules/user.js';
import { initWS, initWSCommands } from './modules/whitestar.js';
import { initmisc } from './modules/misc.js';
import { config } from 'dotenv';
import { initevent, initeventCommands } from './modules/event.js';
import { interactionHandler } from './interactions.js';

//global cached variables
let SFA_Guild: Guild;
let selfMember: GuildMember;
let BaseCommandGroup = new commandGroup("", [], [], [], "", false)
let memberCache: Collection<string, GuildMember>
let lastMemberUpdate = 0

const bot = new Client({
    intents:
        [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages]
})

//Dotenv config setup
config()


const token: string = process.env.BOT_TOKEN!
const rest = new REST().setToken(token);
bot.login(token);

//Initializes all systems and cached variables
bot.once('ready', (readyClient) => {
    console.log("online!")

    initDB()
    BaseCommandGroup = initRS(BaseCommandGroup)
    BaseCommandGroup = initWS(BaseCommandGroup)
    BaseCommandGroup = initUser(BaseCommandGroup)
    BaseCommandGroup = initRole(BaseCommandGroup)
    BaseCommandGroup = initstats(BaseCommandGroup)
    BaseCommandGroup = initHelp(BaseCommandGroup)
    BaseCommandGroup = initmisc(BaseCommandGroup)
    BaseCommandGroup = initevent(BaseCommandGroup)
    const commands = [initeventCommands(), initWSCommands()].flat()
    refreshCommands(commands)
    initAFKTimeoutCheckLoop()
    readyClient.guilds.fetch(SFAcorp)
        .then(guild => {
            SFA_Guild = guild
            SFA_Guild.members.fetch()
                .then(members => {
                    memberCache = members
                    lastMemberUpdate = Date.now()
                    //@ts-ignore
                    selfMember = members.get(getSelfUser().id)
                })
        })
})

//Sends the log embed when someone leaves the server
bot.on('guildMemberRemove', async (member) => {
    const d = Date.now()
    let farewellembed = new EmbedBuilder()
        .setColor(member.displayColor)
        .setTitle(`${member.user.tag} left the server.`)
        .addFields({ name: '\u200b', value: `ID: ${member.id}\nUsername: ${member.user.username}\nJoined at: <t:${Math.floor((member.joinedTimestamp ?? d) / 1000)}:f>\nIn other words: <t:${Math.floor((member.joinedTimestamp ?? d) / 1000)}:R>\nNew Server Members: ${member.guild.memberCount}` })
        .setThumbnail(member.user.displayAvatarURL({ size: 4096 }))
    sendEmbed(logchannel, "", farewellembed)
    queryDB(`DELETE FROM playerinrun WHERE playerID = ${member.id}`)
})

//Sends the log embed when someone joins the server, adds @Representative and greets them in #welcome
bot.on('guildMemberAdd', async member => {
    const d = Date.now()
    let greetembed = new EmbedBuilder()
        .setColor(member.displayColor)
        .setTitle(`${member.user.tag} joined the server.`)
        .addFields({ name: '\u200b', value: `ID: ${member.id}\nUsername: ${member.user.username}\nJoined at: <t:${Math.floor((member.joinedTimestamp ?? d) / 1000)}:f>\nIn other words: <t:${Math.floor((member.joinedTimestamp ?? d) / 1000)}:R>\nNew Server Members: ${member.guild.memberCount}` })
        .setThumbnail(member.user.displayAvatarURL({ size: 4096 }))
    sendEmbed(logchannel, "", greetembed)
    member.roles.add(representativerole)
    member.setNickname(`[] ${member.user.username}`)
    sendMessage(welcomechannel, `Welcome, <@${member.id}>! A <@&${GreeterRole}> will be with you soon. Please answer the below questions:\n⇒ What Corporation are you from, if any?\n⇒ Are you on the lookout for a position in the SFA?\n-~-~-~-~-~-\nPlease visit the <#883082845663428668> channel and read the rules. To unlock RS-queues read through <#795153050104496139> and click the reaction.\n\nWelcome To the Spacefleet Alliance Server!\n<:SpFl:529449288145829918> <:Ender:704541877365375028> <:WC:752321386902716438> <:BMC:926246325287284838> <:DS:579658975692324864> <:SOL:883405937673662484> <:YAL:780171132417605682> <:C55:780171448517263370>`)
})


//Auditlog Implementation for changed/deleted Messages
bot.on("messageUpdate", async (oldmessage, partialNewmessage) => {
    let newmessage = await getFullMessage(partialNewmessage)
    if (newmessage === undefined) return

    if (oldmessage.content !== newmessage.content) {
        if (oldmessage.content === null) oldmessage.content = "This message had no content"
        if (newmessage.content === "") newmessage.content = "This message has no content"
        let auditlogEmbed = new EmbedBuilder()
            .setColor(Colors.Yellow)
            .setAuthor({ iconURL: newmessage.author.displayAvatarURL(), name: (newmessage.member ?? newmessage.author).displayName })
            .setTitle("ℹ️ Message Updated")
            .addFields(
                { name: "Message ID", value: newmessage.id, inline: true },
                { name: "Channel", value: `<#${newmessage.channel.id}>`, inline: true },
                { name: "Old Message", value: oldmessage.content.substring(0, 1024) },
                { name: "New Message", value: newmessage.content.substring(0, 1024) },
            )
        sendEmbed(auditlogchannel, "", auditlogEmbed)
    }
})

bot.on("messageDelete", async (partialOldMessage) => {
    let oldmessage = await getFullMessage(partialOldMessage)
    if (oldmessage === undefined) return

    if (oldmessage.content === "") oldmessage.content = "This message had no content"
    let auditlogEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setAuthor({ iconURL: oldmessage.author.displayAvatarURL(), name: (oldmessage.member ?? oldmessage.author).displayName })
        .setTitle("ℹ️ Message Deleted")
        .addFields(
            { name: "Message ID", value: oldmessage.id, inline: true },
            { name: "Channel", value: `<#${oldmessage.channel.id}>`, inline: true },
            { name: "Content", value: oldmessage.content.substring(0, 1024) },
        )
    sendEmbed(auditlogchannel, "", auditlogEmbed)
})

//Handles chat input command argument splitting
bot.on("messageCreate", (message) => {
    const d = Date.now()
    if (message.author === getSelfUser() || !message.inGuild()) {
        return;
    }

    //Treat any text inside "" as single argument instead of splitting on whitespace
    const split = /"(.*?)"/g;
    let result: string[] = []
    let current: RegExpExecArray | null
    while (current = split.exec(message.content)) {
        let str = current.pop()
        if (str !== undefined) result.push(str);
    }

    let rawargs = message.content.split('"')
    let allargs: string[] = []
    for (let i = 0; i < rawargs.length; i++) {
        if ((i % 2 === 0 || i === rawargs.length - 1)) {
            if (rawargs[i].trim().split(' ')[0] !== "") {
                allargs = allargs.concat(rawargs[i].trim().split(' '))
            }
        }
        else {
            allargs.push(result[(i - 1) / 2])
        }
    }

    if (allargs.length > 0 && message.member) {
        autoresponsecheck(message, d, [...allargs])

        let commandName = allargs[0]
        let args = allargs.slice(1).map(arg => { return { lowercase: arg.toLowerCase(), original: arg } })

        //Call the actual command handler base function
        if (commandName.startsWith(prefix)) {
            BaseCommandGroup.call(commandName.slice(prefix.length), args, message, d, "", true)
        }
    }
})

bot.on(Events.InteractionCreate, async (interaction) => interactionHandler(interaction))

bot.on(Events.ChannelCreate, channelCreateHandler);
bot.on(Events.ChannelUpdate, channelUpdateHandler);

/**
 * Checks if a Message is a partial type and fetches the full information if it is
 */
async function getFullMessage(partialMessage: PartialMessage | Message) {
    if (partialMessage.partial) {
        try {
            return await partialMessage.fetch()
        }
        catch (err) {
            console.log(err);
            return
        }
    }
    return partialMessage
}

/*
    Discord API abstraction layer
    (Almost) All discord API calls should be made through this set of functions
    These functions should not change input/output parameters or types
*/

/**
 * Sends a plain text message in a guild channel
 */
async function sendMessage(channelID: string, content: string) {
    return new Promise<Message<true>>((resolve, reject) => {
        fetchChannel(channelID)
            .then(channel => {
                channel.send(content.replaceAll("@everyone", "").replaceAll(`<@&${SFA_Guild.roles.everyone.id}>`, "")).then(sent => {
                    resolve(sent)
                })
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Sends a plain text message to a user via DM
 */
async function sendDM(userID: string, content: string) {
    return new Promise<Message<false>>((resolve, reject) => {
        bot.users.fetch(userID).then(user => {
            user.send(content).then(sent => {
                resolve(sent)
            })
        })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Sends an embed with optional text in a guild channel
 */
async function sendEmbed(channelID: string, content: string, embed: EmbedBuilder) {
    return new Promise<Message>((resolve, reject) => {
        fetchChannel(channelID)
            .then(channel => {
                channel.send({ content: content.replaceAll("@everyone", "").replaceAll(`<@&${SFA_Guild.roles.everyone.id}>`, ""), embeds: [embed] }).then(sent => {
                    resolve(sent)
                })
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Updates an embed with optional text in a guild channel
 */
async function updateEmbed(channelID: string, messageID: string, content: string, embed: EmbedBuilder) {
    return new Promise<Message>((resolve, reject) => {
        fetchMessage(messageID, channelID)
            .then(message => {
                message.edit({ content: content, embeds: [embed] }).then(edited => {
                    resolve(edited)
                })

            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Fetches a message by its ID and channel ID
 */
async function fetchMessage(messageID: string, channelID: string) {
    return new Promise<Message>((resolve, reject) => {
        fetchChannel(channelID)
            .then(channel => {
                channel.messages.fetch(messageID)
                    .then(message => {
                        resolve(message)
                    })
                    .catch(err => {
                        reject(err)
                    })
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Fetches a Guild Member by its ID.
 */
async function fetchMember(memberID: string) {
    return new Promise<GuildMember>((resolve, reject) => {
        SFA_Guild.members.fetch(memberID)
            .then(member => {
                if (member != undefined && member != null) {
                    resolve(member)
                }
                else {
                    reject()
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Fetches a Guild Text Channel by its ID
 */
async function fetchChannel(channelID: string) {
    return new Promise<GuildTextBasedChannel>((resolve, reject) => {
        SFA_Guild.channels.fetch(channelID, {})
            .then(channel => {
                if (channel && !channel.isVoiceBased() && channel.isTextBased() && !channel.isThreadOnly()) {
                    resolve(channel)
                }
                else {
                    reject()
                }
            })
            .catch(err => {
                reject(err)
            })
    })
}

/**
 * Fetches a Guild Role by its ID
 */
async function fetchRole(roleID: string) {
    return new Promise<Role>((resolve, reject) => {
        SFA_Guild.roles.fetch(roleID)
            .then(role => {
                resolve(role!)
            })
            .catch(err => {
                reject(err)
            })
    })
}

function getSelfUser() {
    return bot.user
}

function getSelfMember() {
    return selfMember
}

/**
 * gets the member with the specified name, will ask for user input if multiple members were found. returns null if no members were found
 */
async function getmember(channelID: string, membername: string, callerID: string, suppressErrorMessages: boolean) {
    return new Promise<GuildMember | null>(async (resolve) => {
        getallMembers()
            .then(allmembers => {
                let members: GuildMember[] = []
                let membernames: string[] = []
                allmembers.forEach(thismember => {
                    if (thismember.displayName.toLowerCase().includes(membername) || thismember.user.username.toLowerCase().includes(membername) || membername.includes(thismember.id)) {
                        members.push(thismember)
                        membernames.push(`${thismember.displayName} / ${thismember.user.tag}`)
                    }
                })
                if (members.length === 0) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are no members with the name or ID of ${membername}`)
                    }
                    resolve(null)
                }
                else if (members.length >= 10) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are too many members with the name of ${membername}. Narrow down your search specifications or search by the member's ID or Mention.`)
                    }
                    resolve(null)
                }
                else if (members.length === 1) {
                    resolve(members[0])
                }
                else {
                    playerInputChoice(channelID, callerID, membernames, "Membername / Username", "Choose a Member", Colors.Yellow, `Multiple members with their names containing ${membername} were found! Please select one of them.`)
                        .then(index => {
                            resolve(members[index])
                        })
                        .catch(() => {
                            resolve(null)
                        })
                }
            })
    })
}

async function getallMembers() {
    return new Promise<Collection<string, GuildMember>>(async (resolve, reject) => {
        const d = Date.now();
        if (d < lastMemberUpdate + 60000) {
            resolve(memberCache)
        }
        else {
            SFA_Guild.members.fetch()
                .then(allmembers => {
                    memberCache = allmembers
                    lastMemberUpdate = d
                    resolve(allmembers)
                })
                .catch(error => {
                    reject(error)
                })
        }
    })
}

/**
 * gets the role with the name rolename, will ask for user input if multiple roles were found. returns null if no roles were found
 */
async function getrole(channelID: string, rolename: string, callerID: string, suppressErrorMessages: boolean) {
    return new Promise<Role | null>(async (resolve) => {
        SFA_Guild.roles.fetch()
            .then(allroles => {
                let roles: Role[] = []
                let rolenames: string[] = []
                allroles.forEach(thisrole => {
                    if (thisrole.name.toLowerCase().includes(rolename) || rolename.includes(thisrole.id)) {
                        roles.push(thisrole)
                        rolenames.push(thisrole.name)
                    }
                })
                if (roles.length === 0) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are no roles with the name or ID of ${rolename}`)
                    }
                    resolve(null)
                }
                else if (roles.length >= 10) {
                    if (!suppressErrorMessages) {
                        sendMessage(channelID, `There are too many roles with the name of ${rolename}. Narrow down your search specifications or search by the role's ID or Mention.`)
                    }
                    resolve(null)
                }
                else if (roles.length === 1) {
                    resolve(roles[0])
                }
                else {
                    playerInputChoice(channelID, callerID, rolenames, "Rolename", "Choose a Role", Colors.Yellow, `Multiple roles with their names containing ${rolename} were found! Please select one of them.`)
                        .then(index => {
                            resolve(roles[index])
                        })
                        .catch(() => {
                            resolve(null)
                        })
                }
            })
    })
}

/**
 * Queries player input through a choice menu
 * @param choiceList List of Strings to be displayed as choices
 * @param optionHeader Short header for the choice list
 * @param title Embed Title
 * @param color Embed Color
 * @param description Embed body text
 * @returns chosen index in choice list
 */
async function playerInputChoice(channelID: string, userID: string, choiceList: string[], optionHeader: string, title: string, color: ColorResolvable, description: string) {
    return new Promise<number>((resolve, reject) => {
        if (choiceList.length <= 9) {
            const coiceReactions = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"]
            fetchChannel(channelID)
                .then(channel => {
                    let choiceEmbed = new EmbedBuilder()
                        .setColor(color)
                        .setTitle(title)
                        .setFooter({ text: 'This query will auto-cancel in 1 minute' })
                    let content = `${description}\n\n\`\`\`#  ${optionHeader}\n-------------------------`
                    for (let i = 0; i < choiceList.length; i++) {
                        content += `\n${i + 1}  ${choiceList[i]}`
                    }
                    content += `\`\`\``
                    choiceEmbed.setDescription(content)
                    channel.send({ embeds: [choiceEmbed] }).then(sent => {
                        for (let i = 0; i < choiceList.length; i++) {
                            sent.react(coiceReactions[i])

                        }
                        sent.react("❌")
                            .then(() => {
                                const filter = (reaction: MessageReaction, user: User) => {
                                    return user.id === userID;
                                };
                                sent.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] }).then(reactions => {
                                    let reaction = reactions.first()
                                    sent.delete()
                                    let accepted = false
                                    for (let i = 0; i < choiceList.length; i++) {
                                        if (reaction?.emoji.name === coiceReactions[i]) {
                                            accepted = true
                                            resolve(i)
                                        }
                                    }
                                    if (!accepted) {
                                        channel.send("Selection cancelled")
                                        reject()
                                    }
                                }).catch(() => {
                                    sent.delete()
                                    channel.send("Selection cancelled due to timeout")
                                    reject()
                                })
                            })
                    })
                })
        }
        else {
            reject()
        }
    })
}

/** 
    Refreshes discord slash commands
*/
async function refreshCommands(commands: SlashCommandOptionsOnlyBuilder[]) {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
        Routes.applicationCommands(getSelfUser().id),
        { body: commands },
    );
    //@ts-ignore
    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
}

function getAllCommands() {
    return BaseCommandGroup
}

export {
    sendMessage,
    sendEmbed,
    fetchMessage,
    fetchChannel,
    fetchMember,
    fetchRole,
    playerInputChoice,
    sendDM,
    getSelfUser,
    getrole,
    getmember,
    updateEmbed,
    getSelfMember,
    getAllCommands,
    getallMembers
}