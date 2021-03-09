'use strict'

const express = require('express')
const router = express.Router()
const debug = require('debug')('yat:api')

const stripe = require('stripe')(require('../../config/constants').stripe.secret)


router.post('/intent', async (req, res) => {
  debug(req.body)

  const { billing } = req.body
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: billing === 'year' ? 2400 : 300,
    currency: 'usd'
  })

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

router.post('/subscription', async (req, res) => {
  debug(req.body)

  const { billing } = req.body
  
  const paymentIntent = await stripe.checkout.sessions.create({
    amount: billing === 'year' ? 2400 : 300,
    currency: 'usd'
  })

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

module.exports = router