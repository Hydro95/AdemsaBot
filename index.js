const Discord = require("discord.js");
const { tokens, dbUrl, developers } = require("./secrets.js");
const mongoose = require("mongoose");
mongoose.connect(dbUrl);

const { MessageActionRow, MessageButton, MessageEmbed } = Discord;

const GuildData = require("./models/GuildData.js");
const ReactionMessage = require("./models/ReactionMessage.js");

const { FLAGS: iFlags } = Discord.Intents;

const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  intents: new Discord.Intents([
    iFlags.GUILDS,
    iFlags.GUILD_MESSAGES,
    iFlags.GUILD_MESSAGE_REACTIONS,
  ]),
});

const matchCommandName = (query, command) => {
  return query === command || query === `${command}-guild`;
};

client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  }

  const emoji = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : reaction.emoji.name;

  console.log(
    `${user.username} reacted to ${reaction.message.author.username}'s message (${reaction.message.id}) with ${emoji}`
  );

  ReactionMessage.find(
    {
      guildId: reaction.message.guildId,
      messageId: reaction.message.id,
    },
    async (err, res) => {
      if (err) {
        return console.log(err);
      }

      const rolesToGive = [];
      res[0].emojiRoles.forEach((v, i) => {
        if (v.emoji === emoji) rolesToGive.push(i);
      });

      client.guilds.cache.forEach((g) => {
        if (g.id === reaction.message.guildId) {
          g.members.cache.forEach((m) => {
            if (m.id === user.id) {
              g.roles.cache.forEach((r) => {
                if (rolesToGive.includes(r.id)) {
                  m.roles.add(r);
                }
              });
            }
          });
        }
      });
    }
  );
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  }

  const emoji = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : reaction.emoji.name;

  console.log(
    `${user.username} unreacted to ${reaction.message.author.username}'s message (${reaction.message.id}) with ${emoji}`
  );

  ReactionMessage.find(
    {
      guildId: reaction.message.guildId,
      messageId: reaction.message.id,
    },
    async (err, res) => {
      if (err) {
        return console.log(err);
      }

      const rolesToRemove = [];
      res[0].emojiRoles.forEach((v, i) => {
        if (v.emoji === emoji) rolesToRemove.push(i);
      });

      client.guilds.cache.forEach((g) => {
        if (g.id === reaction.message.guildId) {
          g.members.cache.forEach((m) => {
            if (m.id === user.id) {
              g.roles.cache.forEach((r) => {
                if (rolesToRemove.includes(r.id)) {
                  m.roles.remove(r);
                }
              });
            }
          });
        }
      });
    }
  );
});

//Messages
client.on("interactionCreate", async (inter) => {
  if (!inter.isCommand()) return;
  if (!developers.includes(inter.user.id)) {
    return await inter.reply({
      content: "You're not authorized to use that command.",
      ephemeral: true,
    });
  }
  //console.log(inter);

  GuildData.findOneAndUpdate(
    { guildId: inter.guildId },
    { $set: { guildId: inter.guildId } },
    { upsert: true, new: true },
    (err) => {
      if (err) return console.log(err);
      console.log(
        `[COMMAND] [${inter.commandName}] ${inter.user.username}#${inter.user.discriminator} @ ${inter.member.guild.name}`
      );
    }
  );

  if (matchCommandName(inter.commandName, "ping")) {
    const buttons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("pingSendSecretPong")
        .setLabel("Send Secret Pong")
        .setStyle("PRIMARY")
    );
    await inter.reply({ content: "Pong!", components: [buttons] });
  }

  if (matchCommandName(inter.commandName, "role-assigner")) {
    console.log(inter);
    const subCommand = inter.options.getSubcommand();

    if (subCommand === "list") {
      ReactionMessage.find({ guildId: inter.guildId }, async (err, res) => {
        if (err) {
          await inter.reply({
            content: "Something went wrong. Please contact an admin.",
          });
          return console.log(err);
        }
        return await inter.reply({
          content: `Here is a list of all available emojis and their corresponding roles. If any emojis are not visible in this message, the emoji is likely a global one from outside the server.\n${res
            .map((rm) => {
              console.log(rm.emojiRoles);
              const lines = [`Message (id: ${rm.messageId})`];
              rm.emojiRoles.forEach((er) => {
                lines.push(`${er.emoji} -> ${er.name}`);
              });
              return lines.join("\n");
            })
            .join("\n")}`,
        });
      });
    }
    if (subCommand === "add") {
      const messageId = inter.options.getString("message-id");
      const emoji = inter.options.getString("emoji");
      const role = inter.options.getRole("role");

      ReactionMessage.findOneAndUpdate(
        { guildId: inter.guildId, messageId },
        {
          $set: {
            guildId: inter.guildId,
            messageId,
            [`emojiRoles.${role.id}`]: { emoji, name: role.name },
          },
        },
        { upsert: true, new: true },
        async (err) => {
          if (err) {
            await inter.reply({
              content: "Something went wrong. Please contact an admin.",
            });
            return console.log(err);
          }
          console.log(
            `[ReactionMessage] [UPDATED] ${role.name} -> ${emoji} : ${inter.user.username}#${inter.user.discriminator} @ ${inter.member.guild.name}`
          );
          await inter.reply({
            content: `Updated message (id: ${messageId}) to assign role "${role.name}" when reacted to with "${emoji}".`,
          });
        }
      );

      console.log(emoji, role);
    }
  }
});

client.once("ready", () => {
  console.log("Ready!");
});

client.login(tokens.discord);
