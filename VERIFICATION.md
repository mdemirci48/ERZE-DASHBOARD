# Dashboard Verification Checklist

Use this checklist to verify that the CEO Income Dashboard is working correctly with your ERZE_2025 database.

**New Table Format:**
- Months displayed as rows (Current month, Month-1, Month-2, Month-3)
- Branches displayed as columns (IZMIR, URFA, FLEX, TOTAL)
- All customer types combined into single income total
- Discounts automatically subtracted from income

## Data Structure Verification

### ✅ Account Code Patterns
Verify that your SAP Business One system uses the following account code patterns:

- **Domestic Customers**: Accounts starting with `600-01-`
- **International Customers**: Accounts starting with `601-01-`
- **Other Customers**: Accounts starting with `602-01-`
- **Sales Discounts Type 1**: Accounts starting with `610-01-`
- **Sales Discounts Type 2**: Accounts starting with `612-01-`

> **Note**: Account codes may have additional segments after the prefix (e.g., `600-01-001`, `600-01-DEPT-A`)

### ✅ Branch Names and IDs
Confirm your branch IDs and names match the expected values:
- IZMIR: BPLId = 1
- URFA: BPLId = 3
- FLEX: BPLId = 4

### ✅ JDT1 Table Structure
Verify the `JDT1` table contains these columns:
- `Account` (GL account code)
- `BPLId` (Business Place ID for branches)
- `RefDate` (Reference/Document date)
- `Credit` (Credit amount)
- `Debit` (Debit amount)
- `TransType` (Transaction type)
- `SourceLine` (Source line indicator)

## Calculation Verification

### ✅ Total Income Calculation
For each month displayed, verify the following:

1. **Total Income** = SUM of Credit amounts for all accounts starting with `600-01-`, `601-01-`, OR `602-01-`
2. **Total Discounts** = SUM of Credit amounts for all accounts starting with `610-01-` OR `612-01-`
3. **Net Income** = Total Income - Total Discounts (displayed in table)

### ✅ Table Structure Verification
Verify the table displays:
- **Rows**: Current month, Month-1, Month-2, Month-3 (with actual month names)
- **Columns**: IZMIR, URFA, FLEX, TOTAL
- **TOTAL column**: Sum of all three branches for each month

### ✅ Branch Totals
For each branch column, verify:

1. **Branch Total** = Sum of all 4 months (Current + Month-1 + Month-2 + Month-3) for that branch
2. **Combined Total** = Sum of all branches for that category

### ✅ Final Row Verification
The "Net Income" row should show:
- **Monthly columns**: (Income - Discounts) for each month
- **Branch columns**: (Income - Discounts) summed across all 4 months for each branch
- **Combined Total**: Total net income across all branches and months

## Testing Steps

### Step 1: Manual SQL Query Comparison
Run this query in SQL Server Management Studio for a specific month (e.g., October 2025):

```sql
-- Income accounts
SELECT 
    CASE 
        WHEN Account LIKE '600-01-%' THEN 'Domestic'
        WHEN Account LIKE '601-01-%' THEN 'International'
        WHEN Account LIKE '602-01-%' THEN 'Other'
    END as Category,
    BPLId,
    SUM(Credit) as TotalCredit
FROM JDT1  
WHERE RefDate >= '2025-10-01' 
    AND RefDate <= '2025-10-31'  
    AND TransType <> '-3'  
    AND (SourceLine <> -8 OR SourceLine IS NULL) 
    AND BPLId IN (1, 3, 4)
    AND Account LIKE '60[012]-01-%'
GROUP BY 
    CASE 
        WHEN Account LIKE '600-01-%' THEN 'Domestic'
        WHEN Account LIKE '601-01-%' THEN 'International'
        WHEN Account LIKE '602-01-%' THEN 'Other'
    END,
    BPLId
ORDER BY Category, BPLId;

-- Discount accounts
SELECT 
    BPLId,
    SUM(Credit) as TotalDiscounts
FROM JDT1  
WHERE RefDate >= '2025-10-01' 
    AND RefDate <= '2025-10-31'  
    AND TransType <> '-3'  
    AND (SourceLine <> -8 OR SourceLine IS NULL) 
    AND BPLId IN (1, 3, 4)
    AND (Account LIKE '610-01-%' OR Account LIKE '612-01-%')
GROUP BY BPLId
ORDER BY BPLId;
```

Compare these results with what the dashboard displays for October 2025.

### Step 2: Cross-Month Verification
Pick a specific account (e.g., `600-01-001`) and verify its monthly values:

1. Check the account's credit amounts for each month in SAP
2. Verify the dashboard shows the same amounts in the correct month columns
3. Confirm branch totals include this account's contributions

### Step 3: Net Income Validation
Calculate manually for one month:
- Total Income = Sum of all income account credits
- Total Discounts = Sum of all discount account credits  
- Net Income = Total Income - Total Discounts

Compare with the dashboard's "Net Income" row for that month.

### Step 4: Edge Cases
Test these scenarios:

- **Month with no income**: Dashboard should show 0.00, not errors
- **Month with no discounts**: Discount row should show 0.00
- **New account codes**: If you have accounts like `600-01-NEW`, they should be included
- **Partial month data**: If today is Oct 15, only Oct 1-15 should be included

## Common Issues and Solutions

### Issue: Dashboard shows 0.00 for all values
**Check**: 
- Database connection credentials in `config.local.js`
- Network connectivity to SQL Server `192.168.101.222`
- Account code patterns in your SAP system

### Issue: Discounts not being subtracted
**Check**:
- Discount account codes actually start with `610-01-` or `612-01-`
- Discount accounts have credit amounts (not just debit)
- Date ranges match between income and discount queries

### Issue: Branch totals don't match monthly sums
**Check**:
- Branch IDs in your system match (1, 3, 4)
- No transactions are missing due to `TransType` or `SourceLine` filters
- All account codes are being captured by the LIKE patterns

### Issue: Performance is slow
**Check**:
- Database indexes on `RefDate`, `Account`, and `BPLId` columns
- Network latency between application server and SQL Server
- Consider implementing caching for frequently accessed periods

## Final Validation

Once all checks pass, the dashboard is ready for CEO use. The table should display:

- ✅ Months as rows with actual month names (e.g., "October 2025")
- ✅ Branch columns: IZMIR, URFA, FLEX, TOTAL
- ✅ All monetary values formatted in Turkish Lira (₺) with proper decimal formatting
- ✅ Total income (all customer types combined) with discounts automatically subtracted

- ✅ Current month income for domestic, international, and other customers
- ✅ Previous 3 months of historical data
- ✅ Sales discounts properly subtracted from totals
- ✅ Separate columns for each branch (IZMIR, URFA, FLEX)
- ✅ Combined totals across all branches
- ✅ Net income calculated correctly as (Income - Discounts)

If you find discrepancies, use the `test-queries.js` script to debug specific queries and compare results with your SAP system directly.