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
  if(req.header('X-Access-Token') && 
      req.header('X-Access-Token-Secret') && 
      req.header('X-Access-Token') === 'demo' &&
      req.header('X-Access-Token-Secret') === 'demo') {
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

app.use('/tt', auth, require('./routes/tt'))
// app.use('/payment', auth, require('./routes/payment'))
app.use('/payment', require('./routes/payment'))

debug(constants)

module.exports = app