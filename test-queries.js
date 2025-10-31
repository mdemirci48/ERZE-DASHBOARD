/**
 * Test script to validate SQL queries against the ERZE_2025 database
 * Run this script separately to test queries before integrating with the dashboard
 */

const sql = require('mssql');

// Load configuration - try to load local config first, fall back to default
let config;
try {
    config = require('./config.local.js');
    console.log('Loaded local configuration from config.local.js');
} catch (error) {
    config = require('./config.js');
    console.log('Using default configuration from config.js');
}

const sqlConfig = config.sqlServer;

async function testIncomeQuery() {
    console.log('Testing Income Query...');
    
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
        const incomeQuery = `
            SELECT 
                T0.[Account],
                T0.[BPLId],
                SUM(T0.[Credit]) as TotalCredit
            FROM [dbo].[JDT1] T0  
            WHERE T0.[RefDate] >= @startDate 
                AND T0.[RefDate] <= @endDate  
                AND T0.[TransType] <> '-3'  
                AND (T0.[SourceLine] <> -8 OR T0.[SourceLine] IS NULL) 
                AND T0.[BPLId] IN (1, 3, 4)
                AND (
                    T0.[Account] LIKE '600-01-%' 
                    OR T0.[Account] LIKE '601-01-%' 
                    OR T0.[Account] LIKE '602-01-%'
                )
            GROUP BY T0.[Account], T0.[BPLId]
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate))
            .input('endDate', sql.Date, new Date(endDate))
            .query(incomeQuery);
        
        console.log('Income Query Results:');
        console.log('Total rows:', result.recordset.length);
        
        // Group by prefix for verification
        const grouped = {
            '600-01-': [],
            '601-01-': [],
            '602-01-': []
        };
        
        result.recordset.forEach(row => {
            if (row.Account.startsWith('600-01-')) {
                grouped['600-01-'].push(row);
            } else if (row.Account.startsWith('601-01-')) {
                grouped['601-01-'].push(row);
            } else if (row.Account.startsWith('602-01-')) {
                grouped['602-01-'].push(row);
            }
        });
        
        Object.entries(grouped).forEach(([prefix, rows]) => {
            console.log(`\n${prefix} accounts: ${rows.length} rows`);
            rows.slice(0, 3).forEach(row => {
                console.log(`  Account: ${row.Account}, Branch: ${row.BPLId}, Credit: ${row.TotalCredit}`);
            });
            if (rows.length > 3) {
                console.log(`  ... and ${rows.length - 3} more rows`);
            }
        });
        
    } catch (error) {
        console.error('Error testing income query:', error);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

async function testDiscountQuery() {
    console.log('\n\nTesting Discount Query...');
    
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
        const discountQuery = `
            SELECT 
                T0.[Account],
                T0.[BPLId],
                SUM(T0.[Credit]) as TotalCredit
            FROM [dbo].[JDT1] T0  
            WHERE T0.[RefDate] >= @startDate 
                AND T0.[RefDate] <= @endDate  
                AND T0.[TransType] <> '-3'  
                AND (T0.[SourceLine] <> -8 OR T0.[SourceLine] IS NULL) 
                AND T0.[BPLId] IN (1, 3, 4)
                AND (
                    T0.[Account] LIKE '610-01-%' 
                    OR T0.[Account] LIKE '612-01-%'
                )
            GROUP BY T0.[Account], T0.[BPLId]
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate))
            .input('endDate', sql.Date, new Date(endDate))
            .query(discountQuery);
        
        console.log('Discount Query Results:');
        console.log('Total rows:', result.recordset.length);
        
        result.recordset.slice(0, 5).forEach(row => {
            console.log(`  Account: ${row.Account}, Branch: ${row.BPLId}, Credit: ${row.TotalCredit}`);
        });
        
        if (result.recordset.length > 5) {
            console.log(`  ... and ${result.recordset.length - 5} more rows`);
        }
        
    } catch (error) {
        console.error('Error testing discount query:', error);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

async function testBranchTotals() {
    console.log('\n\nTesting Branch Totals Query...');
    
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
        // Combined query to get all data at once
        const combinedQuery = `
            SELECT 
                CASE 
                    WHEN T0.[Account] LIKE '600-01-%' THEN 'Domestic'
                    WHEN T0.[Account] LIKE '601-01-%' THEN 'International'
                    WHEN T0.[Account] LIKE '602-01-%' THEN 'Other'
                    WHEN T0.[Account] LIKE '610-01-%' OR T0.[Account] LIKE '612-01-%' THEN 'Discount'
                END as Category,
                T0.[BPLId],
                SUM(T0.[Credit]) as TotalCredit
            FROM [dbo].[JDT1] T0  
            WHERE T0.[RefDate] >= @startDate 
                AND T0.[RefDate] <= @endDate  
                AND T0.[TransType] <> '-3'  
                AND (T0.[SourceLine] <> -8 OR T0.[SourceLine] IS NULL) 
                AND T0.[BPLId] IN (1, 3, 4)
                AND (
                    T0.[Account] LIKE '600-01-%' 
                    OR T0.[Account] LIKE '601-01-%' 
                    OR T0.[Account] LIKE '602-01-%'
                    OR T0.[Account] LIKE '610-01-%'
                    OR T0.[Account] LIKE '612-01-%'
                )
            GROUP BY 
                CASE 
                    WHEN T0.[Account] LIKE '600-01-%' THEN 'Domestic'
                    WHEN T0.[Account] LIKE '601-01-%' THEN 'International'
                    WHEN T0.[Account] LIKE '602-01-%' THEN 'Other'
                    WHEN T0.[Account] LIKE '610-01-%' OR T0.[Account] LIKE '612-01-%' THEN 'Discount'
                END,
                T0.[BPLId]
            ORDER BY Category, T0.[BPLId]
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate))
            .input('endDate', sql.Date, new Date(endDate))
            .query(combinedQuery);
        
        console.log('Combined Results by Category and Branch:');
        const branchNames = { 1: 'IZMIR', 3: 'URFA', 4: 'FLEX' };
        result.recordset.forEach(row => {
            const branchName = branchNames[row.BPLId] || `Branch ${row.BPLId}`;
            console.log(`  ${row.Category} - ${branchName}: ${row.TotalCredit}`);
        });
        
    } catch (error) {
        console.error('Error testing combined query:', error);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// Run all tests
async function runAllTests() {
    console.log('=== CEO Income Dashboard - Query Testing ===\n');
    
    await testIncomeQuery();
    await testDiscountQuery();
    await testBranchTotals();
    
    console.log('\n=== Testing Complete ===');
}

// Execute if run directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { testIncomeQuery, testDiscountQuery, testBranchTotals, runAllTests };