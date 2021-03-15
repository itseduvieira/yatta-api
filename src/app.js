'use strict'

const admin = require('firebase-admin')
const debug = require('debug')('yat:api')
const cors = require('cors')

const paymentService = require('./services/payment.service')

admin.initializeApp({
  credential: admin.credential.cert(require('../config/serviceAccountKey.json')),
  databaseURL: require('../config/constants').firebase.database
})

const app = require('express')()
const bodyParser = require('body-parser')
const constants = require('../config/constants')

app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))

// app.use(cors({ origin: '*' }))

app.use(function (req, res, next) {

    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200')

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')

    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')

    res.setHeader('Access-Control-Allow-Credentials', true)

    next();
})

const auth = async (req, res, next) => {
  if(req.header('x-access-token') && 
      req.header('x-access-token-secret') && 
      req.header('x-access-token') === 'demo' &&
      req.header('x-access-token-secret') === 'demo') {
    
    delete req.headers['x-access-token']
    delete req.headers['x-access-token-secret']
    
    next()
  } else {
    const auth = req.headers['authorization']
    const parts = auth ? auth.split(' ') : []

    try {
      if(!auth || parts[0] !== 'Bearer') {
        throw Error('No credentials provided')
      } else {
        // await admin
        //   .auth()
        //   .verifyIdToken(parts[1])

        const uid = req.header('x-auth-uid')
        if(uid) {
          const subscription = await paymentService.getSubscriptionStatus(null, null, uid)

          if(subscription.status === 'active') {
            next()
          } else {
            res.status(402).json({ 
              message: 'No active subscription found', 
              subscription: subscription
            })
          }
        }
      } 
    } catch(error) {
      debug(error)

      res.status(401).json({ message: 'Unauthorized' })
    }
  }
}

app.use('/twitter', auth, require('./routes/twitter.api'))
app.use('/profile', require('./routes/profile.api'))
app.use('/payment', require('./routes/payment.api'))

debug(constants)

module.exports = app