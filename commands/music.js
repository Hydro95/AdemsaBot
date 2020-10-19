const ytdl = require("ytdl-core-discord");

const SECRETS = require("../secrets.js");

const alertError = (message, err) => {
  console.log(Date.now(), err);
  message.reply(
    "Sorry, something went wrong. You can try again but if the issue persists please let @Hydro#0950 know."
  );
};

const numberFormatter = (number, digits) => {
  const symbolArray = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" }
  ];
  const regex = /\.0+$|(\.[0-9]*[1-9])0+$/;
  let result = "";

  for (let i = 0; i < symbolArray.length; i++) {
    if (number >= symbolArray[i].value) {
      result =
        (number / symbolArray[i].value).toFixed(digits).replace(regex, "$1") +
        symbolArray[i].symbol;
    }
  }
  return result;
};

const timestamp = sec => {
  var hours = Math.floor(sec / 3600);
  var minutes = Math.floor((sec - hours * 3600) / 60);
  var seconds = sec - hours * 3600 - minutes * 60;

  if (minutes < 10 && hours) minutes = "0" + minutes;
  if (seconds < 10) seconds = "0" + seconds;
  return `${hours ? hours + ":" : ""}${minutes}:${seconds}`;
};

let connections = {};
let dispatchers = {};
let queues = {};
let lastPlayerMessage = {};
let lastPlayerCollector = {};
let infoCache = {};

const setDispatcher = async (url, message, playerMessage) => {
  const getPlayNextSong = () => async () => {
    const queue = queues[message.guild.id].queue;
    queues[message.guild.id].track++;
    if (queue[queues[message.guild.id].track]) {
      dispatchers[message.guild.id] = connection.play(
        await ytdl(queue[queues[message.guild.id].track], {
          filter: "audioonly",
          highWaterMark: 1 << 25
        }),
        {
          quality: "highestaudio",
          highWaterMark: 1 << 25,
          type: "opus"
        }
      );
      player(message, playerMessage);
    }
  };

  const connection = connections[message.guild.id];
  const { queue, track } = queues[message.guild.id];
  try {
    const dispatcher = connection.play(await ytdl(url || queue[track]), {
      quality: "highestaudio",
      highWaterMark: 1 << 25,
      type: "opus"
    });
    dispatcher.on("finish", getPlayNextSong());
    dispatchers[message.guild.id] = dispatcher;
  } catch (err) {
    alertError(message, err);
  }
};

const next = async (message, playerMessage) => {
  console.log(queues[message.guild.id].track);
  if (queues[message.guild.id].queue[queues[message.guild.id].track + 1]) {
    queues[message.guild.id].track++;
    setDispatcher(null, message, playerMessage);
    player(message, playerMessage);
  }
};

const previous = async (message, playerMessage) => {
  console.log(queues[message.guild.id].track);
  if (queues[message.guild.id].queue[queues[message.guild.id].track - 1]) {
    queues[message.guild.id].track--;
    setDispatcher(null, message, playerMessage);
    player(message, playerMessage);
  }
};

const pause = message => {
  const dispatcher = dispatchers[message.guild.id];
  dispatcher.pause();
};

const resume = (message, playerMessage) => {
  const dispatcher = dispatchers[message.guild.id];
  if (dispatcher.paused) {
    dispatcher.resume();
  } else {
    setDispatcher(null, message, playerMessage);
  }
};

const play = async (message, args, playerMessage) => {
  const url = args ? args[1] : null;
  if (parseInt(url)) {
    queues[message.guild.id].track = parseInt(url) - 1;
    return setDispatcher(null, message, playerMessage);
  }
  if (!dispatchers[message.guild.id] || url) {
    setDispatcher(url, message, playerMessage);
  } else {
    resume(message);
  }
};

const player = (message, playerMessage) => {
  let url;
  try {
    url = queues[message.guild.id].queue[queues[message.guild.id].track];
  } catch (e) {
    console.log(e);
  }
  //console.log(url);
  if (!url) return message.reply("Nothing is playing.");
  (infoCache[url]
    ? Promise.resolve(infoCache[url])
    : ytdl.getBasicInfo(url)
  ).then(
    info => {
      infoCache[url] = info;
      const details = info.videoDetails;
      //const dispatcher = dispatchers[message.guild.id];

      const embed = {
        embed: {
          title: details.title,
          url: url,
          /* Currently ${
            !dispatcher ? "Stopped" : dispatcher.paused ? "Paused" : "Playing"
          } (*/
          description: `Track ${queues[message.guild.id].track + 1}/${
            queues[message.guild.id].queue.length
          } (Length: ${timestamp(details.lengthSeconds)})`,
          thumbnail: details.thumbnail.thumbnails[0],
          footer: {
            iconURL: details.author.avatar,
            /* due to a discord bug, I cannot include the youtube emoji for sub count alongside the channel name
          <:YouTube:766750292171161680> ${numberFormatter(details.author.subscriber_count, 1)}
          */
            text: `${details.author.name} // ${numberFormatter(
              details.viewCount,
              1
            )} 👁️ // 👍 ${numberFormatter(
              details.likes,
              1
            )} 👎 ${numberFormatter(details.dislikes, 1)}`
          }
        }
      };

      let mProm;
      if (playerMessage && !(playerMessage instanceof Array)) {
        mProm = playerMessage.edit("", embed);
      } else {
        mProm = message.channel.send("", embed);
        mProm.then(m => {
          if (lastPlayerMessage[message.guild.id])
            lastPlayerMessage[message.guild.id].delete().then(() => {
              lastPlayerMessage[message.guild.id] = m;
            });
          else {
            lastPlayerMessage[message.guild.id] = m;
          }
        });
      }

      mProm.then(m => {
        const connection = connections[message.guild.id];

        m.react("⏮️");
        m.react("▶️");
        m.react("⏸️");
        m.react("⏭️");
        m.react("⏏️");

        const collector =
          lastPlayerCollector[m.id] ||
          m.createReactionCollector(
            (reaction, user) =>
              !user.bot &&
              ["⏮️", "▶️", "⏸️", "⏭️", "⏏️"].includes(reaction.emoji.name)
          );

        if (!lastPlayerCollector[m.id]) {
          collector.on("collect", (reaction, user) => {
            //console.log(user);
            switch (reaction.emoji.name) {
              case "⏮️":
                previous(message, m);
                break;
              case "▶️":
                play(message, null, m);
                break;
              case "⏸️":
                pause(message);
                break;
              case "⏭️":
                next(message, m);
                break;
              case "⏏️":
                m.delete();
                connection.disconnect();
                break;
            }
            reaction.users.remove(user.id);
          });
        }
        lastPlayerCollector[m.id] = collector;
      });
    },
    err => alertError(message, err)
  );
};

const queue = message => {
  const noQueue =
    !queues[message.guild.id] ||
    !queues[message.guild.id].queue ||
    !queues[message.guild.id].queue.length;

  message
    .reply(
      noQueue ? "Queue is empty!" : "Fetching info, this could take a moment..."
    )
    .then(m => {
      if (noQueue) return;

      Promise.all(
        queues[message.guild.id].queue.map(
          url =>
            new Promise(res =>
              (infoCache[url]
                ? Promise.resolve(infoCache[url])
                : ytdl.getBasicInfo(url)
              ).then(
                info => res(info.playerResponse.videoDetails.title),
                err => alertError(message, err)
              )
            )
        )
      ).then(names =>
        m.edit(
          `\`\`\`${names
            .map((n, i) =>
              i === queues[message.guild.id].track
                ? `${i + 1}. ${n} - Now Playing`
                : `${i + 1}. ${n}`
            )
            .join("\n")}\`\`\``
        )
      );
    });
};

const clear = message => {
  queues[message.guild.id] = { queue: [], track: 0 };
};

const remove = (message, args) => {
  const index = parseInt(args[1]);
  queues[message.guild.id].queue.splice(index - 1, 1);
  if (args[index] < queues[message.guild.id].track) {
    queues[message.guild.id].track--;
  }
};

const add = (message, args) => {
  if (!queues[message.guild.id])
    queues[message.guild.id] = { queue: [], track: 0 };
  args.slice(1).forEach(url => queues[message.guild.id].queue.push(url));
  if (!lastPlayerMessage[message.guild.id]) player(message);
};

const join = message => {
  if (message.member.voice.channel) {
    message.member.voice.channel
      .join()
      .then(connection => (connections[message.guild.id] = connection));
  } else {
    message.reply("You're not in a voice channel!");
  }
};

const volume = (message, args) => {
  const input = args[1];
  const converted = parseInt(input);
  const clamped = Math.min(2, Math.max(0, converted / 100));
  const dispatcher = dispatchers[message.guild.id];
  dispatcher.setVolume(clamped);
};

module.exports = {
  join: join,
  play: play,
  player: player,
  pause: pause,
  add: add,
  remove: remove,
  next: next,
  previous: previous,
  clear: clear,
  queue: queue,
  help: message => {
    const dev = Object.keys(SECRETS.developers)[0];
    console.log(dev);
    //console.log(message.guild.members);
    const devMember = [...message.guild.members.cache].find(
      x => x[0] + "" === dev + ""
    );
    let avatar, username, discriminator;
    if (devMember) {
      avatar = devMember[1].user.avatarURL();
      username = devMember[1].user.username;
      discriminator = devMember[1].user.discriminator;
    }

    //.user.avatarURL());
    message.reply("here's how you can use the `music` command.", {
      embed: {
        description: "Optional arguments are provided inside `<>` brackets.",
        fields: [
          {
            name: "join",
            value: "The bot will enter the voice channel you're currently in"
          },
          {
            name: "add url <url url ...>",
            value:
              "Add a URL to the queue. You can add multiple URLs at once by separating them by a space.\n- Example: Add two songs to the queue:\n`!music add https://youtu.be/vbQYMvS7Rnw https://youtu.be/hzGmbwS_Drs`"
          },
          {
            name: "play <url/number>",
            value:
              "If no arguments are provided, the bot will try to resume current playback. If a URL is provided, the bot will immediately play the song at that URL. If a number is provided, the bot will try to play the video at that index in the queue.\n- Example: Play a song directly:`!music play https://youtu.be/iH464FG7cG8`\n- Example: Play track 3 in the queue: `!music play 3`"
          },
          {
            name: "pause",
            value: "The bot will pause playback of the current song."
          },
          {
            name: "next",
            value: "The bot will skip to the next song in the queue."
          },
          {
            name: "previous",
            value: "The bot will go back to the previous song in the queue."
          },
          { name: "queue", value: "The bot will reply with the active queue." },
          { name: "clear", value: "The bot will clear the queue." },
          {
            name: "player",
            value:
              "The bot will open up a music player with basic controls.\n\n\n"
          }
        ],
        footer: {
          iconURL: avatar,
          text: `Stuck? Contact @${username}#${discriminator} for help.`
        }
      }
    });
  }
};
