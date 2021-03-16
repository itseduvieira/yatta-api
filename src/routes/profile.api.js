'use strict'

const express = require('express')
const router = express.Router()

const twitterService = require('../services/twitter.service')
const paymentService = require('../services/payment.service')

router.get('/me', async (req, res) => {
  const accessToken = req.header('x-access-token')
  const accessTokenSecret = req.header('x-access-token-secret')
  const uid = req.header('x-auth-uid')

  const profile = await twitterService.getProfile(accessToken, accessTokenSecret)

  if(uid) {
    profile.data.subscription = await paymentService.getSubscriptionStatus(uid)
  }

  res.json(profile.data)
})

module.exports = router