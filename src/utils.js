'use strict'

const admin = require('firebase-admin')

admin.initializeApp({
    credential: admin.credential.cert(require('../config/serviceAccountKey.json')),
    databaseURL: require('../config/constants').firebase.database
});

(async () => {
    await admin.auth().setCustomUserClaims('VAMGfsX0LBZhDm7ZX0809FYOBYm1', null)

    // { customerId: ''}

    await admin.app().delete()
})()