const dbAddr = "127.0.0.1:27017";
const dbName = "ademsabot-test";
const applicationId = "<YOUR APPLICATION ID>";
const testGuildId = "<YOUR TEST SERVER GUILD ID>";
const discordToken = "<YOUR DISCORD APPLICATION TOKEN>";

const developers = ["<YOUR DISCORD USER ID>"];

module.exports = {
  dbUrl: `mongodb://${dbAddr}/${dbName}`,
  dbName: dbName,
  tokens: { discord: discordToken },
  guilds: { test: testGuildId },
  clientId: applicationId,
  developers,
};
