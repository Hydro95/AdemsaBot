const mongoose = require("mongoose");

const emojiRoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  emoji: { type: String, required: true },
});

const reactionMessageSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  emojiRoles: { type: Map, of: emojiRoleSchema },
  messageId: { type: String },
});

const ReactionMessage = mongoose.model(
  "ReactionMessage",
  reactionMessageSchema
);

module.exports = ReactionMessage;
