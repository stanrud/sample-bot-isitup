'use strict';

const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const TextMessage = require('viber-bot').Message.Text;
require('dotenv').config();

const winston = require('winston');
const toYAML = require('winston-console-formatter');
const ngrok = require('./get_public_url');

var request = require('request');

function createLogger() {
    const logger = new winston.Logger({
        level: "debug" // We recommend using the debug level for development
    });

    logger.add(winston.transports.Console, toYAML.config());
    return logger;
}

function say(response, message, optionalKeyboard) {
    response.send(new TextMessage(message, optionalKeyboard));
}

function checkUrlAvailability(botResponse, urlToCheck) {

    if (urlToCheck === '') {
        say(botResponse, 'I need a URL to check');
        return;
    }

    say(botResponse, 'One second...Let me check!');

    var url = urlToCheck.replace(/^http:\/\//, '');
    request('http://isup.me/' + url, function(error, requestResponse, body) {
        if (error || requestResponse.statusCode !== 200) {
            say(botResponse, 'Something is wrong with isup.me.');
            return;
        }

        if (!error && requestResponse.statusCode === 200) {
            if (body.search('is up') !== -1) {
                say(botResponse, 'Hooray! ' + urlToCheck + '. looks good to me.');
            } else if (body.search('Huh') !== -1) {
                say(botResponse, 'Hmmmmm ' + urlToCheck + '. does not look like a website to me. Typo? please follow the format `test.com`');
            } else if (body.search('down from here') !== -1) {
                say(botResponse, 'Oh no! ' + urlToCheck + '. is broken.');
            } else {
                say(botResponse, 'Snap...Something is wrong with isup.me.');
            }
        }
    })
}

const logger = createLogger();

if (!process.env.VIBER_PUBLIC_ACCOUNT_ACCESS_TOKEN_KEY) {
    logger.debug('Could not find the Viber account access token key in your environment variable. Please make sure you followed readme guide.');
    return;
}

// Creating the bot with access token, name and avatar
const bot = new ViberBot(logger, {
    authToken: process.env.VIBER_PUBLIC_ACCOUNT_ACCESS_TOKEN_KEY, // Learn how to get your access token at developers.viber.com
    name: "Matroluxetest",
    avatar: "https://dl-media.viber.com/1/share/2/long/vibes/icon/image/0x0/68c5/dcccb7645955107f5075907062fce9132c9c1238724ad5aa6e2e22da0fe068c5.jpg" // Just a placeholder avatar to display the user
});

// The user will get those messages on first registration
bot.onConversationStarted(response => {
    say(response, `Hi there ${response.userProfile.name}. I am Matroluxetest bot! Feel free to ask me if a web site is down for everyone or just you. Just send me a name of a website and I'll do the rest!`, {
        "Type":"keyboard",
        "DefaultHeight":true,
        "Buttons":[
           {
              "ActionType":"reply",
              "ActionBody":"reply to me",
              "Text":"Головна",
              "TextSize":"regular"
           },
           {
              "ActionType":"reply",
              "ActionBody":"reply to me",
              "Text":"Назад",
              "TextSize":"regular"
           }
        ]
     });
});

bot.on(BotEvents.MESSAGE_RECEIVED, (message, response) => {
    // This sample bot can answer only text messages, let's make sure the user is aware of that.
    if (!(message instanceof TextMessage)) {
        say(response, `Sorry. I can only understand text messages.`);
    }
});

bot.onTextMessage(/./, (message, response) => {
    checkUrlAvailability(response, message.text);
});

if (process.env.NOW_URL || process.env.HEROKU_URL) {
    const http = require('http');
    const port = process.env.PORT || 8080;

    http.createServer(bot.middleware()).listen(port, () => bot.setWebhook(process.env.NOW_URL || process.env.HEROKU_URL));
} else {
    logger.debug('Could not find the now.sh/Heroku environment variables. Trying to use the local ngrok server.');
    return ngrok.getPublicUrl().then(publicUrl => {
        const http = require('http');
        const port = process.env.PORT || 8080;

        http.createServer(bot.middleware()).listen(port, () => bot.setWebhook(publicUrl));

    }).catch(error => {
        console.log('Can not connect to ngrok server. Is it running?');
        console.error(error);
        process.exit(1);
    });
}
