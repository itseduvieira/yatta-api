'use strict'

const express = require('express')
const router = express.Router()

const stripe = require('stripe')(require('../../config/constants').stripe.secret);


router.post('/intent', async (req, res) => {
  const { items } = req.body
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 100,
    currency: 'usd'
  })

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

module.exports = router