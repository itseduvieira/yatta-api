'use strict'

const express = require('express')
const router = express.Router()
const paymentService = require('../services/payment.service')

router.post('/subscription', async (req, res) => {
    const paymentMethodId = req.body.paymentMethodId
    const customerId = req.body.customerId
    const priceId = req.body.priceId

    try {
        const subscription = await paymentService.createSubscription(paymentMethodId, customerId, priceId)

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

module.exports = router