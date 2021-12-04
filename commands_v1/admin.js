const moment = require("moment");

const startTime = moment();

module.exports = {
  setProperties: (message, args, saveData) => {
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
  },

  ping: (message, args) => {
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
  },

  roles: (message, args, saveData, guildId) => {
    if (args.length === 0) return message.reply("Missing arguments.");

    let guild = saveData.guilds.find(x => x.id === message.guild.id);

    if (args.includes("reload") || !guild) {
      const cleanGuild = JSON.parse(JSON.stringify(message.guild));
      if (!saveData.guilds.some(g => g.id === message.guild.id)) {
        saveData.guilds.push(cleanGuild);
      } else {
        const ind = saveData.guilds.findIndex(g => g.id === message.guild.id);
        if (ind > -1) saveData.guilds[ind] = cleanGuild;
      }
      guild = saveData.guilds.find(x => x.id === message.guild.id);
    }

    if (args.includes("register")) {
      const allRoles = guild.roles
        .map(k => {
          const role = [...message.guild.roles.cache].find(
            ([rk]) => rk === k
          )[1];
          return `\`${k}: ${role.name}\``;
        })
        .join("\n");

      const messageId = args[args.indexOf("register") + 1];

      saveData.guildSettings[guildId].lastRoleMessageRegistration = messageId;

      message.reply(
        `Starting role registration process for message ${messageId}.\n\nUse the command \`!roles add [emoji] [roleid]\` to allow a user to react to the provided message with the given emoji and receive the given role.\n\nList of all available roles:\n\n${allRoles}\n\n`
      );
    }

    if (args.includes("add")) {
      if (!saveData.guildSettings[guildId].lastRoleMessageRegistration) {
        message.reply(
          "Did you forget to start the registration process? Use command `!roles register [messageId]`"
        );
      }

      const si = args.indexOf("add");

      const [emoji, roleId] = args.slice(si + 1);

      if (
        !saveData.reactionListeners[
          saveData.guildSettings[guildId].lastRoleMessageRegistration
        ]
      ) {
        saveData.reactionListeners[
          saveData.guildSettings[guildId].lastRoleMessageRegistration
        ] = {
          description: message.guild.name,
          roleMap: {}
        };
      }

      const emojiId = (/<a*:(.*?):\d*>/g.exec(emoji) || [0, emoji.trim()])[1];

      saveData.reactionListeners[
        saveData.guildSettings[guildId].lastRoleMessageRegistration
      ].roleMap[emojiId] = roleId;

      message.react("☑️");
    }
  }
};
