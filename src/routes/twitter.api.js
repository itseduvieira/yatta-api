'use strict'

const express = require('express')
const router = express.Router()
const moment = require('moment-timezone')

const twitterService = require('../services/twitter.service')

router.get('/stats', async (req, res) => {
  const accessToken = req.header('X-Access-Token')
  const accessTokenSecret = req.header('X-Access-Token-Secret')

  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  const data = [];
  let maxId;
  
  for(let i = 0; i < 5; i++) {
    const tweets = (await twitterService.getUserTimeline(accessToken, accessTokenSecret, maxId)).data

    const lastTweet = tweets[tweets.length - 1]

    if(!lastTweet || maxId === lastTweet.id) break;

    data.push(...tweets)

    maxId = lastTweet.id
  }

  const raw = data.map(tweet => {
    let rts = 0

    if(tweet.full_text) {
      if (tweet.full_text.startsWith('RT')) {
        rts = 0
      } else {
        rts = tweet.retweet_count
      }
    }

    return { 
      tweet: tweet.full_text,
      created: tweet.created_at,
      favs: tweet.favorite_count,
      rts: rts
    }
  })

  const frequency = {};
  let maxKey, max = 0;
  for(let i = 0; i < raw.length; i++) {
    let item = raw[i]
    let key = moment.tz(item.created, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'UTC').format('HH')
    key = String(transformToLocalTime(parseInt(key), offset)).padStart(2, '0')

    if(frequency[key]) {
      frequency[key] = (frequency[key] + item.rts + item.favs)
    } else {
      frequency[key] = (item.rts + item.favs)
    }

    maxKey = maxKey && max > frequency[key] ? maxKey : key
    max = max > frequency[key] ? max : frequency[key]
  }

  const period = raw.length > 0 ? {
    start: raw[raw.length - 1].created,
    end: raw[0].created
  } : null

  const result = {
    raw: raw,
    count: raw.length,
    frequency: frequency,
    rts: raw.reduce((acc, item) => acc + item.rts, 0),
    favs: raw.reduce((acc, item) => acc + item.favs, 0),
    period: period,
    bestTime: maxKey
  }

  res.json(result)
})

router.get('/timeline', async (req, res) => {
  const userTimeline = await twitterService.getUserTimeline(req, res)
  
  return res.json(userTimeline.data)
})

function transformToLocalTime(time, timeZoneOffset) {
  if(timeZoneOffset === 0) return time;
  let result = time - Math.trunc(timeZoneOffset / 60);
  time = result < 0 ? (24 + result) : result;
  return time
}

module.exports = router