// Database configuration for ERZE_2025
// Copy this file to config.local.js and update with your actual credentials
// config.local.js should be added to .gitignore

module.exports = {
    sqlServer: {
        user: 'sa',        // Replace with your SQL Server username
        password: 'Eropa2018!',    // Replace with your SQL Server password
        server: '192.168.101.222',   // SQL Server IP address
        database: 'ERZE_2025',        // Database name
        options: {
            encrypt: false,           // Set to true if using Azure SQL
            trustServerCertificate: true, // For local development
            connectionTimeout: 30000,
            requestTimeout: 60000
        }
    },
    server: {
        port: process.env.PORT || 3000
    },
    password: '141525' // Change this to your desired password
};