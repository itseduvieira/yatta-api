'use strict'

const Twitter = require('twit')
const constants = require('../../config/constants')

const getProfile = async (accessToken, accessTokenSecret) => {
  const client = new Twitter({
    consumer_key: constants.twitter.consumerKey,
    consumer_secret: constants.twitter.consumerSecret,
    access_token: accessToken ? accessToken : constants.twitter.accessToken,
    access_token_secret: accessTokenSecret ? accessTokenSecret : constants.twitter.accessTokenSecret
  })

  return await client.get(`account/verify_credentials`)
}

const getUserTimeline = async (accessToken, accessTokenSecret, maxId) => {
  const params = { tweet_mode: 'compat', count: 50 }

  if(accessToken && accessTokenSecret) {
    params.count = 200

    if(maxId) {
      params.max_id = maxId
    }
  }

  const client = new Twitter({
    consumer_key: constants.twitter.consumerKey,
    consumer_secret: constants.twitter.consumerSecret,
    access_token: accessToken ? accessToken : constants.twitter.accessToken,
    access_token_secret: accessTokenSecret ? accessTokenSecret : constants.twitter.accessTokenSecret
  })

  return await client.get(`statuses/user_timeline`, params)
}

const getFollowers = async (accessToken, accessTokenSecret, cursor) => {
    const params = { 
        count: 50,
        include_user_entities: false
    }
  
    if(accessToken && accessTokenSecret) {
      params.count = 200
  
      if(cursor) {
        params.cursor = cursor
      }
    }
  
    const client = new Twitter({
      consumer_key: constants.twitter.consumerKey,
      consumer_secret: constants.twitter.consumerSecret,
      access_token: accessToken ? accessToken : constants.twitter.accessToken,
      access_token_secret: accessTokenSecret ? accessTokenSecret : constants.twitter.accessTokenSecret
    })
  
    return await client.get(`followers/list`, params)
}

module.exports = {
  getProfile: getProfile,
  getUserTimeline: getUserTimeline,
  getFollowers: getFollowers
}