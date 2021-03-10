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

  try {
    await stripe.paymentMethods.attach(req.body.paymentMethodId, {
      customer: req.body.customerId,
    });
  } catch (error) {
    return res.status('402').send({ error: { message: error.message } })
  }

  await stripe.customers.update(
    req.body.customerId,
    {
      invoice_settings: {
        default_payment_method: req.body.paymentMethodId,
      },
    }
  )

  const subscription = await stripe.subscriptions.create({
    customer: req.body.customerId,
    items: [{ price: req.body.priceId }],
    expand: ['latest_invoice.payment_intent'],
  });

  res.send(subscription)
})

module.exports = router