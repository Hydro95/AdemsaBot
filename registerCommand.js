const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { SlashCommandBuilder } = require("@discordjs/builders");

const { tokens, clientId, guilds } = require("./secrets.js");

const token = tokens.discord;
const guildId = guilds.test;

const guildMode = true;

const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
  new SlashCommandBuilder()
    .setName("role-assigner")
    .setDescription(
      "Configures various aspects of the self-service role assignment messages."
    )
    .addSubcommand((s) =>
      s
        .setName("list")
        .setDescription("Lists registered emojis and their associated roles.")
    )
    .addSubcommand(
      (s) =>
        s
          .setName("add")
          .setDescription(
            "Add a new role and emoji pair to the role assigner service."
          )
          .addStringOption((o) =>
            o
              .setName("message-id")
              .setDescription(
                "The message id of the message that the user must react to in order to get the role"
              )
              .setRequired(true)
          )
          .addStringOption((o) =>
            o
              .setName("emoji")
              .setDescription("The emoji the user must press to get this role")
              .setRequired(true)
          )
          .addRoleOption((o) =>
            o
              .setName("role")
              .setDescription(
                "The role that will be assigned to the user upon them clicking the button."
              )
              .setRequired(true)
          )
      /*.addMentionableOption((o) =>
            o
              .setName("message")
              .setDescription("The message associated with this emoji.")
          )*/
      /*
        .addChannelOption((o) =>
          o
            .setName("channel")
            .setDescription("The channel that the message will be posted in.")
            .setRequired(true)
        )*/
    ),
].map((c) => {
  c.name = `${c.name}${guildMode ? "-guild" : ""}`;
  return c;
});

const rest = new REST({ version: "9" }).setToken(token);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    if (guildMode) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
    }

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
