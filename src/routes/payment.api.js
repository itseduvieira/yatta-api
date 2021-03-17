'use strict'

const express = require('express')
const router = express.Router()
const paymentService = require('../services/payment.service')

router.post('/subscription', async (req, res) => {
    const paymentMethodId = req.body.paymentMethodId
    const priceId = req.body.priceId
    const uid = req.header('x-auth-uid')
    const accessToken = req.header('x-access-token')
    const accessTokenSecret = req.header('x-access-token-secret')

    try {
        const subscription = await paymentService.createSubscription(paymentMethodId, uid, 
            priceId, accessToken, accessTokenSecret)

        res.send(subscription)
    } catch (error) {
        res.status(402).json(error)
    }
})

router.get('/portal/:customerId', async (req, res) => {
    const customerId = req.params.customerId

    const url = await paymentService.generatePortalUrl(customerId)

    res.json({ url: url })
})

router.post('/checkout', async (req, res) => {
    const priceId = req.body.priceId
    const returnUrl = req.body.returnUrl

    const id = await paymentService.generateCheckoutId(priceId, returnUrl)

    res.json({ sessionId: id })
})

router.put('/customer', async (req, res) => {
    const screenName = req.body.screenName
    const twitterId = req.body.twitterId
    const sessionId = req.body.sessionId
    const uid = req.body.uid

    const customer = await paymentService.updateCustomer(sessionId, screenName, twitterId, uid)

    res.json({ customer: customer })
})

module.exports = router