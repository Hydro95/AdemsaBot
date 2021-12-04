const Discord = require("discord.js");
const SECRETS = require("./secrets.js");
const fs = require("fs");

const TOKENS = SECRETS.tokens;
const DEVS = SECRETS.developers;

const commands = {
  admin: require("./commands/admin.js"),
  music: require("./commands/music.js"),
};

const { FLAGS: iFlags } = Discord.Intents;

const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  intents: new Discord.Intents([
    iFlags.GUILDS,
    iFlags.GUILD_MESSAGES,
    iFlags.GUILD_MESSAGE_REACTIONS,
  ]),
});

const defaultGuildSettings = {
  prefix: "!",
  lastRoleMessageRegistration: null,
};

const saveData = fs.existsSync("saveData.json")
  ? JSON.parse(fs.readFileSync("saveData.json"))
  : { guilds: [], reactionListeners: {}, guildSettings: {} };

const saveToJSON = (data) => {
  // convert JSON object to string
  const strData = JSON.stringify(data);

  // write JSON string to a file
  fs.writeFile("saveData.json", strData, (err) => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved.");
  });
};

setInterval(() => saveToJSON(saveData), 1000 * 60 * 30); // 30 minute backup

client.once("ready", () => {
  console.log("Ready!");
});

client.on("MESSAGE_CREATE", (message) => {
  console.log(message);
  if (message.guild === null) return;
  const guildId = message.guild.id;
  if (
    !saveData.guildSettings ||
    !saveData.guildSettings[guildId] ||
    !saveData.guildSettings[guildId].adminrole
  ) {
    saveData.guildSettings = Object.assign({}, saveData.guildSettings || {});
    saveData.guildSettings[guildId] = Object.assign({}, defaultGuildSettings);
    saveData.guildSettings[guildId].adminrole = guildId;

    message.channel.send(
      "Important! You must configure an admin role. Copy the id of the role you want to use for bot administration and put it in the command `!set adminrole [your role id here]` (Without the square brackets). Any user with the provided role will be able to use the administration commands.\n\n**You must set this role to use the features of the bot.**"
    );
  }

  const { prefix, adminrole } = saveData.guildSettings[guildId];

  const ADMINS = [...message.guild.members.cache]
    .filter(([, x]) => x._roles.includes(adminrole))
    .map(([k]) => k);

  const msg = message.content;
  if (!msg.startsWith(prefix)) return;

  const [command, ...args] = msg.substring(prefix.length).split(" ");

  if (
    saveData.guildSettings[guildId].adminrole ===
    [...message.guild.roles.cache].find(([, x]) => x.name === "@everyone")[1].id
  ) {
    if (command === "set")
      commands.admin.setProperties(message, args, saveData);
    return;
  }

  // Debugging (owner only)
  if (DEVS[message.author.id]) {
    if (command === "guilds") return console.log(saveData.guilds);
    if (command === "forcesave") return saveToJSON(saveData);
    if (command === "echo") return message.channel.send(args.join(""));
  }

  if (ADMINS.includes(message.author.id + "")) {
    if (command === "ping") return commands.admin.ping(message, args);
    if (command === "roles")
      return commands.admin.roles(message, args, saveData, guildId);
    if (command === "set")
      return commands.admin.setProperties(message, args, saveData);
  }

  switch (command) {
    case "music":
      if (commands.music[args[0]]) {
        commands.music[args[0]](message, args, saveData);
      } else {
        message.reply("I'm sorry, I don't recognize that command.");
      }
      break;
    default:
      message.reply("I'm sorry, I don't recognize that command.");
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) {
    // Handle message being deleted
    try {
      await reaction.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
      return;
    }
  }

  if (!saveData.reactionListeners[reaction.message.id]) return;

  const emoji = reaction._emoji.name.trim();
  const guild = saveData.guilds.find(
    (k) => k.id === reaction.message.channel.guild.id
  );

  // fetch role
  const role = guild.roles.find(
    (k) => k === saveData.reactionListeners[reaction.message.id].roleMap[emoji]
  );
  // fetch guildmember
  const [, guildMember] = [...reaction.message.guild.members.cache].find(
    ([u]) => u === user.id
  );

  guildMember.roles.add(role);
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (reaction.partial) {
    // Handle message being deleted
    try {
      await reaction.fetch();
    } catch (error) {
      console.log("Something went wrong when fetching the message: ", error);
      return;
    }
  }

  if (!saveData.reactionListeners[reaction.message.id]) return;

  const emoji = reaction._emoji.name.trim();
  const guild = saveData.guilds.find(
    (k) => k.id === reaction.message.channel.guild.id
  );

  // fetch role
  const role = guild.roles.find(
    (k) => k === saveData.reactionListeners[reaction.message.id].roleMap[emoji]
  );
  // fetch guildmember
  const [, guildMember] = [...reaction.message.guild.members.cache].find(
    ([u]) => u === user.id
  );

  guildMember.roles.remove(role);
});

client.login(TOKENS.discord);
