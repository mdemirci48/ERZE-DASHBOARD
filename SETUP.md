# Setup Instructions

This document provides instructions for setting up and running the CEO Income Dashboard for SAP Business One.

## Prerequisites

1. Node.js installed (v14 or higher recommended)
2. SAP Business One database access with appropriate permissions
3. SQL Server ODBC driver installed
4. Valid connection string to ERZE_2025 database

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```

## Configuration

1. Copy `config.local.js.example` to `config.local.js`
2. Edit `config.local.js` with your SAP Business One database credentials
3. Ensure the connection string points to your `ERZE_2025` database
   ```
   const config = {
     server: 'YOUR_SERVER_NAME',
     database: 'ERZE_2025',
     user: 'YOUR_USERNAME',
     password: 'YOUR_PASSWORD',
     options: {
       trustedConnection: false,
       encrypt: true,
       enableArithAbort: true
     }
   };
   ```

## Running the Dashboard

To run the dashboard locally:

1. Start the server:
   ```
   node server.js
   ```

2. Open your browser to `http://localhost:3000`

## API Endpoint

The dashboard uses a single API endpoint that returns aggregated income data:

```
GET /api/income-summary
```

This endpoint returns a JSON object with:
- `months`: Array of month names (current + 3 previous)
- `branches`: Object with branch data (IZMIR, URFA, FLEX)
- `totals`: Total income for each month across all branches
- `discounts`: Total discounts for each month
- `netIncome`: Net income (total - discounts) for each month