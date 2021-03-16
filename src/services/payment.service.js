'use strict'

const admin = require('firebase-admin')
const stripe = require('stripe')(require('../../config/constants').stripe.secret)

const twitterService = require('./twitter.service')

const createSubscription = async (paymentMethodId, customerId, priceId) => {
    const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
    })

    for(let i = 0; i < paymentMethods.data.length; i++) {
        const method = paymentMethods.data[i]
        
        await stripe.paymentMethods.detach(method.id)
    }

    await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
    })

    await stripe.customers.update(customerId,
        {
            invoice_settings: {
                default_payment_method: paymentMethodId
            }
        })

    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent']
    })

    return subscription
}

const generatePortalUrl = async (customerId) => {
    const portal = await stripe.billingPortal.sessions.create({
        customer: customerId
    })

    return portal.url
}

const getSubscriptionStatus = async (screenName, twitterId, uid) => {
    const result = {}

    let customer

    const customClaims = (await admin.auth().getUser(uid)).customClaims

    if (customClaims && customClaims.customerId) {
        customer = await stripe.customers.retrieve(customClaims.customerId, {
            expand: ['subscriptions']
        })

        result.customerId = customClaims.customerId

        result.wasCustomer = true

        if (customer.subscriptions && customer.subscriptions.data.length > 0) {
            result.status = customer.subscriptions.data[0].status
            result.type = customer.subscriptions.data[0].plan.id
        }
    } else {
        if (!screenName || !twitterId) {
            const profile = await twitterService.getProfile(accessToken, accessTokenSecret)

            screenName = profile.data.screen_name
            twitterId = profile.data.id_str
        }

        customer = await stripe.customers.create({
            name: `@${screenName}`,
            metadata: {
                firebase: uid,
                twitter: twitterId
            }
        })

        await admin.auth().setCustomUserClaims(uid, { customerId: customer.id })

        result.customerId = customer.id
    }

    return result
}

module.exports = {
    createSubscription: createSubscription,
    generatePortalUrl: generatePortalUrl,
    getSubscriptionStatus: getSubscriptionStatus
}