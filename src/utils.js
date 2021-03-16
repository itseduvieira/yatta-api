'use strict'

const admin = require('firebase-admin')

admin.initializeApp({
    credential: admin.credential.cert(require('../config/serviceAccountKey.json')),
    databaseURL: require('../config/constants').firebase.database
});

(async () => {
    await admin.auth().setCustomUserClaims('tzMtyVIDX7Qyr3xN4mXrEkOChbr2', null)

    await admin.app().delete()
})()