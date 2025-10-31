# CEO Income Dashboard - Implementation Plan

## Project Overview
Create a web-based CEO dashboard displaying income accounts from SAP Business One with live SQL data integration. The dashboard will show current month income plus 3 previous months, with separate columns for each of the 3 branches and a combined total.

## Data Structure & Filtering Rules

### Account Categories to Include:
- **Domestic Customers**: Accounts starting with `600-01-`
- **International Customers**: Accounts starting with `601-01-`
- **Other Customers**: Accounts starting with `602-01-`

### Deductions (Subtract from Total):
- **Sales Discounts - Type 1**: Accounts starting with `610-01-`
- **Sales Discounts - Type 2**: Accounts starting with `612-01-`

### Data Source:
- Database: `ERZE_2025` on SQL Server `192.168.101.222`
- Base Query: SAP's JDT1 table (Journal Detail)
- Branches: BPLId IN (1, 3, 4)
- Date Range: Calendar month (1st to last day)
- Amount Column: Credit (SUM of Credit column)

## Dashboard Table Structure

| Column | Description |
|--------|-------------|
| Account Category | Domestic / International / Other / Discounts |
| Current Month | Income for current calendar month |
| Month -1 | Income for previous month |
| Month -2 | Income for 2 months ago |
| Month -3 | Income for 3 months ago |
| Branch 1 Total | Sum across all 4 time periods for Branch 1 |
| Branch 3 Total | Sum across all 4 time periods for Branch 3 |
| Branch 4 Total | Sum across all 4 time periods for Branch 4 |
| Combined Total | Sum across all branches and time periods |

## Implementation Steps

### Phase 1: SQL Query Development
- [ ] Create parameterized SQL query to fetch income data for specified date range
- [ ] Filter accounts by prefixes (600-01-, 601-01-, 602-01-)
- [ ] Create separate query for discount accounts (610-01-, 612-01-)
- [ ] Ensure queries return data grouped by account prefix and branch (BPLId)
- [ ] Test queries against ERZE_2025 database

### Phase 2: Web Application Structure
- [ ] Create HTML structure with dashboard layout
- [ ] Design responsive table with proper column headers
- [ ] Create CSS styling for professional CEO dashboard appearance
- [ ] Add data loading indicators and error handling UI

### Phase 3: Backend Integration (Node.js/Express)
- [ ] Set up Express server to handle API requests
- [ ] Create database connection to SQL Server (192.168.101.222)
- [ ] Implement API endpoints:
  - `/api/income-data` - Fetch income data for specified month and branches
  - `/api/discount-data` - Fetch discount data
- [ ] Add error handling and logging

### Phase 4: Frontend JavaScript
- [ ] Create functions to fetch data from backend API
- [ ] Implement data calculation logic:
  - Sum income by category and branch
  - Subtract discounts from totals
  - Calculate combined totals
- [ ] Populate dashboard table dynamically
- [ ] Add date navigation (current month, previous months)
- [ ] Implement auto-refresh functionality

### Phase 5: Testing & Validation
- [ ] Test with actual ERZE_2025 data
- [ ] Verify account filtering is correct
- [ ] Validate calculations (income - discounts)
- [ ] Test branch separation and combined totals
- [ ] Performance testing with large datasets

## Technical Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla or React)
- **Backend**: Node.js with Express
- **Database**: SQL Server (ERZE_2025)
- **Connection**: mssql npm package or similar

## Key Considerations
1. **Live Data**: Queries execute on-demand, no persistent table needed
2. **Performance**: Consider caching for frequently accessed periods
3. **Security**: Parameterized queries to prevent SQL injection
4. **Scalability**: Design to handle multiple users accessing simultaneously
5. **Accuracy**: Double-check account code filtering logic matches SAP structure
