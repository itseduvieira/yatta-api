'use strict'

const admin = require('firebase-admin')

(async () => {
    await admin.auth().setCustomUserClaims('', {
        customerId: ''
    })
})()