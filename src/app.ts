import express from 'express';
import Telegraf from 'telegraf';

import {
  HEROKU_URL,
  NODE_ENV,
  PORT,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  TELEGRAM_BOT_TOKEN,
  YOUTUBE_API_KEY,
} from './config';

const fetch = require("node-fetch");
const btoa = require("btoa");

const app = express();
const port = PORT || 8080;

const base64 = btoa(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET);
const urlencoded = new URLSearchParams();
urlencoded.append("grant_type", "client_credentials");

const getTrackIdByLink = (link: string) => {
  return link
    .replace('https://open.spotify.com/track/', '')
    .replace(/(?=[?]).*$/g, '');
}

const searchableText = (artist: string, trackName: string) => {
  const trackSearchText = artist + ' - ' + trackName;
  return trackSearchText.replace(/ /g, '%20');
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

if (NODE_ENV === 'production') {
  bot.startWebhook(HEROKU_URL + bot.token);
}

bot.start((ctx) => ctx.reply('Welcome!\nI am your new bot (Created by Vitor Maracajá)\nSend me a Spotify track link'));

bot.help((ctx) => ctx.reply('You only need send me a Spotify track link, then i will show you 3 Youtube links! =]'));

bot.command('vitorarraza', (ctx) => {
  ctx.reply('Arrazo =]');
  console.log(ctx.callbackQuery);
});


bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.hears(/(https:[/][/]open[.]spotify[.]com[/]track)(.\S*)/g,
  async (ctx) => {
    ctx.reply('You sent me a spotify link =]');

    const messageText = ctx.message.text;
    const spotifyLinksList = messageText.match(/(https:[/][/]open[.]spotify[.]com[/]track)(.\S*)/g);

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + base64,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: urlencoded
    });

    const resultObject = JSON.parse(await response.text());

    const spotifyAuthToken = resultObject.access_token;

    spotifyLinksList.map(async (link: string) => {
      const trackId = getTrackIdByLink(link);

      const trackInfo = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        method: 'get',
        headers: {
          'Authorization': 'Bearer ' + spotifyAuthToken
        }
      });

      const formatedTrackInfo = JSON.parse(await trackInfo.text());
      const trackSearchName = searchableText(formatedTrackInfo.artists[0].name, formatedTrackInfo.name);

      const youtubeTrackInfo = await fetch(`https://www.googleapis.com/youtube/v3/search?part=id%2C%20snippet&maxResults=3&q=${trackSearchName}&key=${YOUTUBE_API_KEY}`);

      ctx.reply('Here are your videos');

      const formatedYoutubeTrackInfo = JSON.parse(await youtubeTrackInfo.text());
      formatedYoutubeTrackInfo.items.map((item: any) => {
        if (item.id.kind === 'youtube#video') {
          ctx.reply(`https://www.youtube.com/watch?v=${item.id.videoId}`);
        }
      });
    });
  }
);

bot.launch();

app.listen(port, () => {
  return console.log(`Arraza's Server is listening on ${port}`);
});

app.get('/', (req, res) => {
  res.send("Arraza's Server is running");
});

app.post('/' + bot.token, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});