'use strict'

const admin = require('firebase-admin')
const stripe = require('stripe')(require('../../config/constants').stripe.secret)
const twitterService = require('./twitter.service')

const createSubscription = async (paymentMethodId, uid, priceId, 
        accessToken, accessTokenSecret, couponId) => {
    
    let coupon

    if(couponId) {
        coupon = await getCoupon(couponId)
    }
    
    const user = await admin.auth().getUser(uid)

    let customerId
    
    const customClaims = user.customClaims

    if (customClaims && customClaims.customerId) {
        customerId = customClaims.customerId

        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        })
    
        for(let i = 0; i < paymentMethods.data.length; i++) {
            const method = paymentMethods.data[i]
            
            await stripe.paymentMethods.detach(method.id)
        }
    } else {
        const profile = await twitterService.getProfile(accessToken, accessTokenSecret)

        const screenName = profile.data.screen_name
        const twitterId = profile.data.id_str

        const customer = await stripe.customers.create({
            name: `@${screenName}`,
            metadata: {
                firebase: uid,
                twitter: twitterId
            }
        })

        await admin.auth().setCustomUserClaims(uid, { customerId: customer.id })

        customerId = customer.id
    }

    if(!coupon || (coupon.percent_off && coupon.percent_off < 100.0)) {
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId
        })

        await stripe.customers.update(customerId,
            {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            })
    } else {
        coupon = null
    }

    let subData = {
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent']
    }
    
    if(coupon) {
        subData.coupon = couponId
    }

    return await stripe.subscriptions.create(subData)
}

const generatePortalUrl = async (customerId) => {
    const portal = await stripe.billingPortal.sessions.create({
        customer: customerId
    })

    return portal.url
}

const generateCheckoutId = async (priceId, returnUrl) => {
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: `${returnUrl}/#/dash/session?id={CHECKOUT_SESSION_ID}`,
        cancel_url: returnUrl
    })

    return session.id
}

const updateCustomer = async (sessionId, screenName, twitterId, uid) => {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const customer = await stripe.customers.update(session.customer, {
        name: `@${screenName}`,
        metadata: {
            firebase: uid,
            twitter: twitterId
        }
    })

    await admin.auth().setCustomUserClaims(uid, { customerId: session.customer })

    const subscriptionStatus = await getSubscriptionStatus(uid)

    customer.subscriptionStatus = subscriptionStatus

    return customer
}

const getSubscriptionStatus = async uid => {
    const result = {}

    let customer

    const customClaims = (await admin.auth().getUser(uid)).customClaims

    if (customClaims && customClaims.customerId) {
        customer = await stripe.customers.retrieve(customClaims.customerId, {
            expand: ['subscriptions']
        })

        result.customerId = customClaims.customerId

        if (customer.subscriptions && customer.subscriptions.data.length > 0) {
            result.status = customer.subscriptions.data[0].status
            result.type = customer.subscriptions.data[0].plan.id
        }
    }

    return result
}

const getCoupon = async couponId => {
    return await stripe.coupons.retrieve(couponId)
}

module.exports = {
    createSubscription: createSubscription,
    generatePortalUrl: generatePortalUrl,
    generateCheckoutId: generateCheckoutId,
    getSubscriptionStatus: getSubscriptionStatus,
    updateCustomer: updateCustomer,
    getCoupon: getCoupon
}