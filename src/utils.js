'use strict'

const admin = require('firebase-admin')

admin.initializeApp({
    credential: admin.credential.cert(require('../config/serviceAccountKey.json')),
    databaseURL: require('../config/constants').firebase.database
});

(async () => {
    // await admin.auth().setCustomUserClaims('INvumKsgPmSBV0pI5DKyxAsPKoq1', null)

    // await admin.auth().setCustomUserClaims('INvumKsgPmSBV0pI5DKyxAsPKoq1', { customerId: ''})

    await admin.app().delete()
})()