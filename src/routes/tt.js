'use strict'

const express = require('express')
const router = express.Router()
const debug = require('debug')('jat:api')
const Twitter = require('twit')
const constants = require('../../config/constants')
const moment = require('moment-timezone')

router.get('/me', async (req, res) => {
  try {
    let accessToken = constants.twitter.accessToken
    let accessTokenSecret = constants.twitter.accessTokenSecret

    if(req.header('X-Access-Token') && req.header('X-Access-Token-Secret')) {
      accessToken = req.header('X-Access-Token')
      accessTokenSecret = req.header('X-Access-Token-Secret')
    }

    const client = new Twitter({
      consumer_key: constants.twitter.consumerKey,
      consumer_secret: constants.twitter.consumerSecret,
      access_token: accessToken,
      access_token_secret: accessTokenSecret
    })

    const me = await client.get(`account/verify_credentials`)

    debug(me)

    res.json(me)
    
  } catch (error) {
    debug(error)

    res.status(500).json(error)
  }
})

router.get('/stats', async (req, res) => {
  try {
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const timeline = await user(req, res);

    const raw = timeline.data.map(tweet => {
      return { 
        tweet: tweet.text,
        created: tweet.created_at,
        favs: tweet.favorite_count,
        rts: tweet.text && tweet.text.startsWith('RT') ? tweet.retweet_count - 1 : tweet.retweet_count
      }
    })

    const frequency = {};
    let maxKey, max = 0;
    for(let i = 0; i < raw.length; i++) {
      let item = raw[i]
      let key = moment.tz(item.created, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'UTC').format('HH')
      key = String(transformToLocalTime(parseInt(key), offset)).padStart(2, '0')

      // debug(key)

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

    // debug(result.frequency)
    // debug(result.count)
    // debug(result.rts)
    // debug(result.favs)
    // debug(result.period)
    // debug(result.bestTime)

    res.json(result)
    
  } catch (error) {
    debug(error)

    res.status(500).json(error)
  }
})

function transformToLocalTime(time, timeZoneOffset) {
  // debug(`bef ${time}`)
  if(timeZoneOffset === 0) return time;
  let result = time - Math.trunc(timeZoneOffset / 60);
  time = result < 0 ? (24 + result) : result;
  // debug(`aft ${time}`)
  return time
}

router.get('/mine', async (req, res) => {
  try {
    return res.json(await user(req, res))
  } catch (error) {
    debug(error)

    res.status(500).json(error)
  }
})

async function user(req, res) {
  const params = { tweet_mode: 'extended', count: 10 }
  // const params = { tweet_mode: 'compat', count: 10 }

  let accessToken = constants.twitter.accessToken
  let accessTokenSecret = constants.twitter.accessTokenSecret

  if(req.header('X-Access-Token') && 
      req.header('X-Access-Token-Secret') && 
      req.header('X-Access-Token') !== 'demo' &&
      req.header('X-Access-Token-Secret') !== 'demo') {
    accessToken = req.header('X-Access-Token')
    accessTokenSecret = req.header('X-Access-Token-Secret')

    params.count = 200
  }

  const client = new Twitter({
    consumer_key: constants.twitter.consumerKey,
    consumer_secret: constants.twitter.consumerSecret,
    access_token: accessToken,
    access_token_secret: accessTokenSecret
  })

  return await client.get(`statuses/user_timeline`, params)
}

module.exports = router