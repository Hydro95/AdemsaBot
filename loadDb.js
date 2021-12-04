const { dbUrl } = require("./secrets.js");
const data = require("./load.json");
const mongoose = require("mongoose");
mongoose.connect(dbUrl);

const ReactionMessage = require("./models/ReactionMessage.js");

data.guilds.forEach((g) => {
  const promises = g.ReactionMessages.map((rm) => {
    return new Promise((res, rej) =>
      Object.keys(rm.emojiRoles).forEach((erId) => {
        const er = rm.emojiRoles[erId];
        ReactionMessage.findOneAndUpdate(
          { guildId: g.guildId, messageId: rm.messageId },
          {
            $set: {
              guildId: g.guildId,
              messageId: rm.messageId,
              [`emojiRoles.${erId}`]: { emoji: er.emoji, name: er.name },
            },
          },
          { upsert: true, new: true },
          async (err) => {
            if (err) {
              rej();
              return console.log(err);
            }
            console.log(
              `[ReactionMessage] [UPDATED] ${er.name} -> ${er.emoji} :`
            );
            res();
          }
        );
      })
    );
  });

  Promise.all(promises).then(() => {
    console.log("All done.");
    mongoose.disconnect();
  });
});
