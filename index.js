const Discord = require("discord.js");
const SECRETS = require("./secrets.js");
const moment = require("moment");
const fs = require("fs");

const TOKENS = SECRETS.tokens;
const DEVS = SECRETS.developers;

const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"]
});

const startTime = moment();

let lastRoleMessageRegistration; // this is fine for a single server

const saveToJSON = data => {
  // convert JSON object to string
  const strData = JSON.stringify(data);

  // write JSON string to a file
  fs.writeFile("saveData.json", strData, err => {
    if (err) {
      throw err;
    }
    console.log("JSON data is saved.");
  });
};

const defaultGuildSettings = {
  prefix: "!"
};

const saveData = fs.existsSync("saveData.json")
  ? JSON.parse(fs.readFileSync("saveData.json"))
  : { guilds: [], reactionListeners: {}, guildSettings: {} };

setInterval(() => saveToJSON(saveData), 1000 * 60 * 30); // 30 minute backup

client.once("ready", () => {
  console.log("Ready!");
});

client.on("message", message => {
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

  const [command, ...args] = msg.substring(1).split(" ");

  if (
    saveData.guildSettings[guildId].adminrole ===
    [...message.guild.roles.cache].find(([, x]) => x.name === "@everyone")[1].id
  ) {
    if (command === "set") setProperties(message, args);
    return;
  }

  // Debugging (owner only)
  if (DEVS[message.author.id]) {
    if (command === "guilds") console.log(saveData.guilds);
    if (command === "forcesave") saveToJSON(saveData);
  }

  if (ADMINS.includes(message.author.id + "")) {
    if (command === "ping") ping(message, args);
    if (command === "roles") roles(message, args);
    if (command === "set") setProperties(message, args);
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
    k => k.id === reaction.message.channel.guild.id
  );

  // fetch role
  const role = guild.roles.find(
    k => k === saveData.reactionListeners[reaction.message.id].roleMap[emoji]
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
    k => k.id === reaction.message.channel.guild.id
  );

  // fetch role
  const role = guild.roles.find(
    k => k === saveData.reactionListeners[reaction.message.id].roleMap[emoji]
  );
  // fetch guildmember
  const [, guildMember] = [...reaction.message.guild.members.cache].find(
    ([u]) => u === user.id
  );

  guildMember.roles.remove(role);
});

const setProperties = (message, args) => {
  if (args.length === 0) return message.reply("Missing arguments.");
  if (args.includes("prefix") && args.length === 2) {
    saveData.guildSettings[message.guild.id].prefix = args[1];
    message.reply(
      `Updated my command prefix to \`${args[1]}\`. Test me with \`${args[1]}ping\`.`
    );
  }

  if (args.includes("adminrole") && args.length === 2) {
    saveData.guildSettings[message.guild.id].adminrole = args[1];
    message.reply(
      `Updated my admin role to \`${
        args[1]
      }\`. Assign the role to yourself if you do not already have it and then test me with \`${
        saveData.guildSettings[message.guild.id].prefix
      }ping\`.`
    );
  }
};

const ping = (message, args) => {
  let extra = "";
  if (args.includes("extra")) {
    const info = {
      uptime: moment.duration(startTime.diff(moment())).humanize()
    };

    extra = Object.keys(info)
      .map(k => `${k}: ${info[k]}`)
      .join("\n");
  }
  const out = `Pong! ${extra ? `\n\n${extra}` : ""}`;
  message.reply(out);
};

const roles = (message, args) => {
  if (args.length === 0) return message.reply("Missing arguments.");

  let guild = saveData.guilds.find(x => x.id === message.guild.id);

  if (args.includes("reload") || !guild) {
    if (!saveData.guilds.some(g => g.id === message.guild.id)) {
      const cleanGuild = JSON.parse(JSON.stringify(message.guild));
      saveData.guilds.push(cleanGuild);
      guild = saveData.guilds.find(x => x.id === message.guild.id);
    }
  }

  if (args.includes("register")) {
    const allRoles = guild.roles
      .map(k => {
        const role = [...message.guild.roles.cache].find(([rk]) => rk === k)[1];
        return `\`${k}: ${role.name}\``;
      })
      .join("\n");

    const messageId = args[args.indexOf("register") + 1];

    lastRoleMessageRegistration = messageId;

    message.reply(
      `Starting role registration process for message ${messageId}.\n\nUse the command \`!roles add [emoji] [roleid]\` to allow a user to react to the provided message with the given emoji and receive the given role.\n\nList of all available roles:\n\n${allRoles}\n\n`
    );
  }

  if (args.includes("add")) {
    if (!lastRoleMessageRegistration) {
      message.reply(
        "Did you forget to start the registration process? Use command `!roles register [messageId]`"
      );
    }

    const si = args.indexOf("add");

    const [emoji, roleId] = args.slice(si + 1);

    if (!saveData.reactionListeners[lastRoleMessageRegistration]) {
      saveData.reactionListeners[lastRoleMessageRegistration] = {
        description: message.guild.name,
        roleMap: {}
      };
    }

    const emojiId = (/<a*:(.*?):\d*>/g.exec(emoji) || [0, emoji.trim()])[1];

    saveData.reactionListeners[lastRoleMessageRegistration].roleMap[
      emojiId
    ] = roleId;

    message.react("☑️");
  }
};

client.login(TOKENS.discord);
