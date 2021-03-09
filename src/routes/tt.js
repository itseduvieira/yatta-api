'use strict'

const express = require('express')
const router = express.Router()
const debug = require('debug')('yat:api')
const Twitter = require('twit')
const constants = require('../../config/constants')
const moment = require('moment-timezone')

const stripe = require('stripe')(require('../../config/constants').stripe.secret)

router.get('/me', async (req, res) => {
  try {
    const profile = await me(req, res)
    profile.subscription = await subscriptionStatus(profile.data)

    res.json(profile.data)
  } catch(error) {
    debug(error)

    res.status(500).json(error)
  }
  
})

router.get('/stats', async (req, res) => {
  try {

    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    const data = [];
    let maxId;
    
    for(let i = 0; i < 5; i++) {
      const tweets = (await user(req, res, maxId)).data

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

    debug(result.frequency)
    debug(result.count)
    debug(result.rts)
    debug(result.favs)
    debug(result.period)
    debug(result.bestTime)

    res.json(result)
    
  } catch (error) {
    debug(error)

    res.status(500).json(error)
  }
})

function transformToLocalTime(time, timeZoneOffset) {
  if(timeZoneOffset === 0) return time;
  let result = time - Math.trunc(timeZoneOffset / 60);
  time = result < 0 ? (24 + result) : result;
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

async function user(req, res, maxId) {
  const params = { tweet_mode: 'compat', count: 50 }

  let accessToken = constants.twitter.accessToken
  let accessTokenSecret = constants.twitter.accessTokenSecret

  if(req.header('X-Access-Token') && 
      req.header('X-Access-Token-Secret') && 
      req.header('X-Access-Token') !== 'demo' &&
      req.header('X-Access-Token-Secret') !== 'demo') {
    accessToken = req.header('X-Access-Token')
    accessTokenSecret = req.header('X-Access-Token-Secret')

    params.count = 200

    if(maxId) {
      params.max_id = maxId
    }
  }

  const client = new Twitter({
    consumer_key: constants.twitter.consumerKey,
    consumer_secret: constants.twitter.consumerSecret,
    access_token: accessToken,
    access_token_secret: accessTokenSecret
  })

  return await client.get(`statuses/user_timeline`, params)
}

async function me(req, res) {
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

  debug(me)

  return await client.get(`account/verify_credentials`)
}

async function subscriptionStatus(me) {
  const result = {
    wasCustomer: false,
    type: null,
    active: false
  }

  let customer

  try {
    customer = await stripe.customers.retrieve(me.id_str, {
      expand: ['subscriptions']
    })

    result.wasCustomer = true

    if(customer.subscriptions.length > 0) {
      debug(customer.subscriptions[0])
    }

    debug(customer)
  } catch(error) {
    debug(error)

    if(error.statusCode === 404) {
      customer = await stripe.customers.create({
        id: me.id
      })
    
      debug(customer)
    }
  }

  return result
}

module.exports = router