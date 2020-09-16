const Discord = require("discord.js");
const SECRETS = require("./secrets.js");
const moment = require("moment");
const fs = require("fs");

const TOKENS = SECRETS.tokens;
const DEVS = SECRETS.developers;

const client = new Discord.Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
});

const prefix = "!";

const startTime = moment();

let lastRoleMessageRegistration; // this is fine for a single server

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

const saveData = fs.existsSync("saveData.json")
  ? JSON.parse(fs.readFileSync("saveData.json"))
  : { guilds: [], reactionListeners: {} };

setInterval(() => saveToJSON(saveData), 1000 * 60 * 30); // 30 minute backup

client.once("ready", () => {
  console.log("Ready!");
});

client.on("message", (message) => {
  const msg = message.content;
  if (!msg.startsWith(prefix)) return;

  const [command, ...args] = msg.substring(1).split(" ");

  console.log(command, args);

  // Debugging
  if (DEVS[message.author.id]) {
    // ping command
    if (command === "ping") ping(message, args);
    if (command === "roles") roles(message, args);
    if (command === "guilds") console.log(saveData.guilds);
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

  console.log(role);

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

  console.log(reaction);

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

const ping = (message, args) => {
  let extra = "";
  if (args.includes("extra")) {
    const info = {
      uptime: moment.duration(startTime.diff(moment())).humanize(),
    };

    extra = Object.keys(info)
      .map((k) => `${k}: ${info[k]}`)
      .join("\n");
  }
  const out = `Pong! ${extra ? `\n\n${extra}` : ""}`;
  message.reply(out);
};

const roles = (message, args) => {
  let guild = saveData.guilds.find((x) => x.id === message.guild.id);

  if (args.includes("reload") || !guild) {
    if (!saveData.guilds.some((g) => g.id === message.guild.id)) {
      const cleanGuild = JSON.parse(JSON.stringify(message.guild));
      saveData.guilds.push(cleanGuild);
      guild = saveData.guilds.find((x) => x.id === message.guild.id);
    }
  }

  if (args.includes("register")) {
    const allRoles = guild.roles
      .map((k) => {
        console.log(message.guild);
        const role = [...message.guild.roles.cache].find(([rk]) => rk === k)[1];
        return `\`${k}: ${role.name}\``;
      })
      .join("\n");

    const si = args.indexOf("register");

    /*
    const [emoji, roleId] = args.slice(si + 1);
    //console.log(emoji, roleId);
    */

    const messageId = args[si + 1];

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
        roleMap: {},
      };
    }

    const emojiId = (/<a*:(.*?):\d*>/g.exec(emoji) || [0, emoji.trim()])[1];

    saveData.reactionListeners[lastRoleMessageRegistration].roleMap[
      emojiId
    ] = roleId;

    message.react("☑️");

    console.log(saveData.reactionListeners[lastRoleMessageRegistration]);

    saveToJSON(saveData);
  }
};

client.login(TOKENS.discord);
