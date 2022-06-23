'use strict'

const Twitter = require('twit')
const fetch = require('node-fetch')
const moment = require('moment-timezone')

const auth = require('../services/auth.service')
const constants = require('../../config/constants')


// const headers = {
//     headers: {
//         'Authorization': `Bearer ${constants.twitter.bearerToken}`
//     }
// }

module.exports.getProfile = async (accessToken, accessTokenSecret) => {
    const client = new Twitter({
        consumer_key: constants.twitter.consumerKey,
        consumer_secret: constants.twitter.consumerSecret,
        access_token: accessToken || constants.twitter.accessToken,
        access_token_secret: accessTokenSecret || constants.twitter.accessTokenSecret
    })

  return await client.get(`account/verify_credentials`)
}

module.exports.getUserTimeline = async (accessToken, accessTokenSecret, maxId) => {
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
    access_token: accessToken || constants.twitter.accessToken,
    access_token_secret: accessTokenSecret || constants.twitter.accessTokenSecret
  })

  return await client.get(`statuses/user_timeline`, params)
}

module.exports.getFollowers = async (accessToken, accessTokenSecret) => {
    const followers = []
    let paginationToken

    do {
        const params = new URLSearchParams({
            'user.fields': 'profile_image_url'
        })

        if (paginationToken) {
            params.append('pagination_token', paginationToken)
        }

        const url = `${constants.twitter.api}/users/72183014/followers?${params}`
        const method = 'get'
        const response = await fetch(url, { headers: auth({ method, url, }, accessToken, accessTokenSecret) })

        const json = await response.json()

        paginationToken = json.meta.next_token

        followers.push(...json.data)
    } while (paginationToken)

    const result = await Promise.all(
        followers.map(async follower => {
            const lastFiveTweets = await getLastFiveTweets(accessToken, accessTokenSecret, follower)
            if(lastFiveTweets?.length > 1) {
                follower.lastTweet = lastFiveTweets[0]
            }
            return follower
        })
    )

    return result
}

const getLastFiveTweets = async (accessToken, accessTokenSecret, follower) => {
    // https://api.twitter.com/2/users/:id/timelines/reverse_chronological?tweet.fields=created_at&expansions=author_id&user.fields=created_at&max_results=5

    const params = new URLSearchParams({
        'tweet.fields': 'created_at',
        start_time: `${moment().add((-2), 'hours').format('YYYY-MM-DDTHH:mm:ss')}Z`,
        max_results: 5
    })

    const url = `${constants.twitter.api}/users/${follower.id}/tweets?${params}`
    const method = 'get'
    const response = await fetch(url, { headers: auth({ method, url, }) })

    const json = await response.json()

    return json.data
}