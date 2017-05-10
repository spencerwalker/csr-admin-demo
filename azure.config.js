module.exports = {
     endpoint: process.env.AZURE_ENDPOINT || 'https://csr-demo.documents.azure.com:443/',
    primaryKey: process.env.AZURE_PRIMARY_KEY || 'zsDBYTdLfXZ4gvtA1yiCxOWpQvARYg2EeJ72wPLd9OwTyWOPEWr6Jm5Tl3RwVZhVA78ZqWavtRueGky4ngpleQ==',
    database: process.env.AZURE_DB_NAME || 'csr-demo',
    integration: {
        clientID: process.env.INTEGRATION_CLIENT_ID || '46114BE7-6283-4D0B-8979-F2E47D8687CA',
        clientSecret: process.env.INTEGRATION_CLIENT_SECRET || 'akd92ksls933ka',
        authURL: process.env.INTEGRATION_AUTH_URL || 'auth.ordercloud.io',
        apiURL: process.env.INTEGRATION_API_URL || 'api.ordercloud.io',
        buyerID: process.env.buyerid || 'AVEDATEST',
        slackChannel: process.env.SLACK_CHANNEL,
        slackToken: process.env.SLACK_TOKEN
    }
};