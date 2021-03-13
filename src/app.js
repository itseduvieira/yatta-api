'use strict'

const admin = require('firebase-admin')
const debug = require('debug')('yat:api')

admin.initializeApp({
  credential: admin.credential.cert(require('../config/serviceAccountKey.json')),
  databaseURL: require('../config/constants').firebase.database
})

const app = require('express')()
const bodyParser = require('body-parser')
const constants = require('../config/constants')

app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(require('cors')({ origin: '*' }))

const auth = async (req, res, next) => {
  if(req.header('x-access-token') && 
      req.header('x-access-token-secret') && 
      req.header('x-access-token') === 'demo' &&
      req.header('x-access-token-secret') === 'demo') {
    
    delete req.headers['x-access-token']
    delete req.headers['x-access-token-secret']
    
    next()
  } else {
    const auth = req.headers["authorization"]
    const parts = auth ? auth.split(' ') : []

    if(!auth || parts[0] !== 'Bearer') {
      res.status(401).json({
          message: 'Unauthorized'
      })
    } else {
      try {
        // await admin
        //   .auth()
        //   .verifyIdToken(parts[1])

        next()
      } catch(error) {
        debug(error)

        res.status(401).json({
          message: 'Unauthorized'
        })
      }
    }
  }
}

app.use('/twitter', auth, require('./routes/twitter.api'))
// app.use('/payment', auth, require('./routes/payment.api'))
app.use('/payment', require('./routes/payment.api'))

debug(constants)

module.exports = app