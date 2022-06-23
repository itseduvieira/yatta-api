'use strict'

module.exports = {
    firebase: {
        database: '',
    },
    mongo: {
        connectionString: ''
    },
    twitter: {
        api: 'https://api.twitter.com/2',
        bearerToken: process.env.BEARER_TOKEN,
        consumerKey: process.env.CONSUMER_KEY,
        consumerSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.ACCESS_TOKEN,
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET
    },
    stripe: {
        secret: process.env.STRIPE_SECRET
    }
}