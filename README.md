# AdemsaBot

Discord bot built for the uOttawa Ademsa server.

## Installation

To run this bot, you must create a Discord Application at Discord's website and obtain a bot token. There is more information on how to do so [here](https://discord.com/developers/applications).

To set up the bot on the machine that will run it, you must install the required dependencies by running `npm install` or similar in the root directory. For daily restarts, I have created the following script on a remote server that pulls from the master branch of the bot and updates, then restarts it:

```
$ cat AdemsaBot.sh
#!/bin/bash

source /home/clinuagj/nodevenv/repositories/AdemsaBot/12/bin/activate;
cd /home/clinuagj/repositories/AdemsaBot;
git pull;
pkill -f "node index.js";
node index.js;
```

Note: the first line of the script (the `source` part) was only needed because the cPanel instance I was using needed some information on where the Node environment variables resided first. You may safely remove that part in your case. Again, YMMV if your setup runs on a different server. If you're looking to run the bot locally a simple `node index.js` will suffice.

## How to Use

Most of the bot is modular, in that the different command modules reside in the `commands` folder. You can get an idea for what they do by looking there. Most of the actual setup of the bot and commands will provide situational help by instructing you what to do next. The default prefix for the bot is "!" and you can test the bot with "!ping".

You will be instructed to set up a bot administrator and the bot will remind you to set it up when you do so. By default, most of the administrative commands won't work until this is done. Make sure to also add your user ID to `secrets.js` if you are the person running the instance of the bot. A template is provided, you may rename it from "secrets_TEMPLATE.js" to "secrets.js".

## Features

### Implemented

- Listen to messages for reactions, and add roles to users based on their reactions
- Join voice channels and play music\* (see Known Issues)

### Planned/Unimplemented

- Polls
- Announcements/Reminders
- Light moderation

## Known issues

Music is sometimes broken or won't work at all depending on where you run the bot. Everything works locally but it may not work on a remote server (the main issue is downloading and storing videos that doesn't seem to work well). If you run the bot on a device you have complete control over, there should be no issues.
