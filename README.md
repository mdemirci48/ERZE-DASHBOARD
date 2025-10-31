# CEO Income Dashboard

A web-based dashboard for CEOs to monitor total income from SAP Business One with live SQL data integration. The dashboard displays current month income plus 3 previous months as rows, with separate columns for each branch (IZMIR, URFA, FLEX) and a TOTAL column.

## Features

- Live data integration with SAP Business One (ERZE_2025 database)
- Total income calculation (all customer types combined)
- Automatic deduction of sales discounts
- Table format: Months as rows, Branches as columns
- Current month + 3 previous months historical data
- Branch columns: IZMIR, URFA, FLEX, and TOTAL
- All values displayed in Turkish Lira (₺)
- Responsive design for desktop and mobile viewing
- Auto-refresh functionality

## Account Processing

### Income Accounts (Included)
- All accounts starting with `600-01-`, `601-01-`, or `602-01-` (combined total)

### Discount Accounts (Subtracted)
- All accounts starting with `610-01-` or `612-01-` (automatically deducted)

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **Database**: SQL Server (ERZE_2025 on 192.168.101.222)
- **Database Connection**: mssql npm package

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd erze-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure database credentials**
   
   Edit the `server.js` file and update the SQL Server configuration:
   ```javascript
   const config = {
       user: 'your_actual_username',    // Replace with your SQL Server username
       password: 'your_actual_password', // Replace with your SQL Server password
       server: '192.168.101.222',
       database: 'ERZE_2025',
       options: {
           encrypt: false,
           trustServerCertificate: true
       }
   };
   ```

4. **Start the server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the dashboard**
   
   Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

### `/api/income-summary`
Fetches simplified income summary (total income minus discounts) by branch for specified date range.

**Parameters:**
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format

**Response:**
```json
{
  "1": 38500.00,
  "3": 29400.00,
  "4": 21800.00
}
```

### `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "message": "CEO Income Dashboard API is running"
}
```

## Security Considerations

- **Database Credentials**: Never commit actual database credentials to version control. Use environment variables in production.
- **SQL Injection**: All queries use parameterized inputs to prevent SQL injection attacks.
- **CORS**: Currently configured for same-origin requests only. Configure CORS appropriately if needed for different origins.

## Environment Variables (Production)

For production deployment, use environment variables instead of hardcoding credentials:

```bash
DB_USER=your_username
DB_PASSWORD=your_password
DB_SERVER=192.168.101.222
DB_DATABASE=ERZE_2025
PORT=3000
```

Then update `server.js` to use:
```javascript
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    // ... rest of config
};
```

## Troubleshooting

### Connection Issues
- Verify SQL Server is accessible from the application server
- Check firewall settings on SQL Server (port 1433)
- Ensure SQL Server authentication is enabled
- Verify database name and credentials are correct

### Data Not Loading
- Check browser console for JavaScript errors
- Verify API endpoints are returning data (test with curl or Postman)
- Ensure date parameters are in correct format (YYYY-MM-DD)

### Performance Issues
- Consider implementing caching for frequently accessed data
- Add database indexes on `RefDate` and `Account` columns if not present
- Monitor query execution plans in SQL Server

## License

MIT License - see LICENSE file for details.