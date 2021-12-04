const mongoose = require("mongoose");

const guildDataSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
});

const GuildData = mongoose.model("GuildData", guildDataSchema);

module.exports = GuildData;
