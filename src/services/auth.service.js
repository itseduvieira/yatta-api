'use strict'

const crypto = require('crypto')
const OAuth1a = require('oauth-1.0a')
const constants = require('../../config/constants')

const auth = (request, accessToken, accessTokenSecret) => {
  const oauth = new OAuth1a({
    consumer: {
      key: constants.twitter.consumerKey,
      secret: constants.twitter.consumerSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64')
    },
  })

  const authorization = oauth.authorize(request, {
    key: accessToken || constants.twitter.accessToken,
    secret: accessTokenSecret || constants.twitter.accessTokenSecret,
  });

  return oauth.toHeader(authorization)
}

module.exports = auth