'use strict'

const express = require('express')
const router = express.Router()
const moment = require('moment-timezone')
const debug = require('debug')('yat:api')
const { writeFile, readFile, stat } = require('fs/promises')
const os = require('os')

const twitterService = require('../services/twitter.service')

router.get('/stats', async (req, res) => {
    const accessToken = req.header('X-Access-Token')
    const accessTokenSecret = req.header('X-Access-Token-Secret')

    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const data = [];
    let maxId

    try {
        const file = await readFile(`${os.tmpdir()}/tweets.json`)

        const { birthtime } = await stat(`${os.tmpdir()}/tweets.json`)

        const created = moment.tz(birthtime, 'UTC')
        const duration = moment.duration(created.diff(moment().utc()))
        const mins = Math.trunc(duration.asMinutes())

        if(mins > (60 * 24)) throw new Error()

        data.push(...JSON.parse(file))
    } catch (err) {
        debug('creating a new tweets.json')

        for (let i = 0; i < 5; i++) {
            const tweets = (await twitterService.getUserTimeline(accessToken, accessTokenSecret, maxId)).data

            const lastTweet = tweets[tweets.length - 1]

            if (!lastTweet || maxId === lastTweet.id) break;

            data.push(...tweets)

            maxId = lastTweet.id
        }

        await writeFile(`${os.tmpdir()}/tweets.json`, JSON.stringify(data))
    }

    const raw = data.map(tweet => {
        let rts = 0

        if (tweet.text) {
            if (tweet.text.startsWith('RT')) {
                rts = 0
            } else {
                rts = tweet.retweet_count
            }
        }

        return {
            tweet: tweet.text,
            created: tweet.created_at,
            favs: tweet.favorite_count,
            rts: rts
        }
    })

    const frequency = {};
    let maxKey, max = 0;
    for (let i = 0; i < raw.length; i++) {
        let item = raw[i]
        let key = moment.tz(item.created, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'UTC').format('HH')
        key = String(transformToLocalTime(parseInt(key), offset)).padStart(2, '0')

        if (frequency[key]) {
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

router.get('/followers', async (req, res) => {
    const accessToken = req.header('X-Access-Token')
    const accessTokenSecret = req.header('X-Access-Token-Secret')

    const offset = req.query.offset ? parseInt(req.query.offset) : 0

    let result

    try {
        const file = await readFile(`${os.tmpdir()}/followers.json`)

        const { birthtime } = await stat(`${os.tmpdir()}/followers.json`)

        const created = moment.tz(birthtime, 'UTC')
        const duration = moment.duration(created.diff(moment().utc()))
        const mins = Math.trunc(duration.asMinutes())

        if(mins > 60) throw new Error()

        result = JSON.parse(file)
    } catch (err) {
        debug('creating a new followers.json')

        const data = []

        const followers = (await twitterService.getFollowers(accessToken, accessTokenSecret))

        data.push(...followers)

        result = data
            .filter(follower => {
                return follower.lastTweet
            })
            .map(follower => {
                const created = moment.tz(follower.lastTweet.created_at, 'UTC')
                const duration = moment.duration(moment().utc().diff(created))
                const mins = Math.trunc(duration.asMinutes())
                follower.minutesAgo = mins
                return follower
            })
            .sort((a, b) => {
                return a.minutesAgo - b.minutesAgo
            })
            .map(follower => {
                const user = follower.username
                const created = `${follower.minutesAgo > 5 ? follower.minutesAgo : 'a few'} minutes ago`

                return {
                    user: user,
                    avatar: follower.profile_image_url,
                    created: created,
                }
            })

        await writeFile(`${os.tmpdir()}/followers.json`, JSON.stringify(result))
    }

    return res.json(result)
})

function transformToLocalTime(time, timeZoneOffset) {
    if (timeZoneOffset === 0) return time;
    let result = time - Math.trunc(timeZoneOffset / 60);
    time = result < 0 ? (24 + result) : result;
    return time
}

module.exports = router