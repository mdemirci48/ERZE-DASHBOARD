const express = require('express');
const sql = require('mssql');
const path = require('path');
const app = express();

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
const PORT = config.server.port;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Helper function to get date range for a month
function getMonthDateRange(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return { startDate, endDate };
}

// API endpoint to fetch income data by account type and branch
app.get('/api/income-summary', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    let pool;
    try {
        // Connect to SQL Server
        pool = await sql.connect(sqlConfig);
        
        // Combined query to get total income and discounts by branch, then calculate net income
        const summaryQuery = `
            SELECT
                T0.[BPLId],
                SUM(CASE
                    WHEN T0.[Account] LIKE '600-01-%' OR T0.[Account] LIKE '601-01-%' OR T0.[Account] LIKE '602-01-%'
                    THEN T0.[Credit] - T0.[Debit]
                    ELSE 0
                END) as TotalIncome,
                SUM(CASE
                    WHEN T0.[Account] LIKE '610-01-%' OR T0.[Account] LIKE '612-01-%'
                    THEN T0.[Debit] - T0.[Credit]
                    ELSE 0
                END) as TotalDiscounts
            FROM [dbo].[JDT1] T0
            WHERE T0.[RefDate] >= CAST(@startDate AS DATE)
                AND T0.[RefDate] <= CAST(@endDate AS DATE)
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
            GROUP BY T0.[BPLId]
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0]) // Format to YYYY-MM-DD
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])     // Format to YYYY-MM-DD
            .query(summaryQuery);
        
        // Log the recordset for debugging purposes
        console.log('Income Query Recordset for:', startDate, '-', endDate, result.recordset);

        // Process results to calculate net income by branch
        const processedData = {
            1: 0, // IZMIR
            3: 0, // URFA
            4: 0  // FLEX
        };
        result.recordset.forEach(row => {
            const branchId = row.BPLId;
            const totalIncome = parseFloat(row.TotalIncome) || 0;
            const totalDiscounts = parseFloat(row.TotalDiscounts) || 0;
            processedData[branchId] = totalIncome - totalDiscounts;
        });
        
        res.json(processedData);
        
    } catch (error) {
        console.error('Error fetching income data:', error);
        res.status(500).json({ error: 'Failed to fetch income data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

// API endpoint to fetch expense data for 720- accounts by branch
app.get('/api/expense-720-summary', async (req, res) => {
    await fetchExpenseData(req, res, '720-%', '720- expense summary');
});

// API endpoint to fetch expense data for 730- accounts by branch
app.get('/api/expense-730-summary', async (req, res) => {
    await fetchExpenseData(req, res, '730-%', '730- expense summary');
});

// API endpoint to fetch expense data for 760- accounts by branch
app.get('/api/expense-760-summary', async (req, res) => {
    await fetchExpenseData(req, res, '760-%', '760- expense summary');
});

// API endpoint to fetch expense data for 770- accounts by branch
app.get('/api/expense-770-summary', async (req, res) => {
    await fetchExpenseData(req, res, '770-%', '770- expense summary');
});

// API endpoint to fetch expense data for 780- accounts by branch
app.get('/api/expense-780-summary', async (req, res) => {
    await fetchExpenseData(req, res, '780-%', '780- expense summary');
});

// API endpoint to fetch raw materials cost data
app.get('/api/raw-materials-cost-summary', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
        const rawMaterialsQuery = `
            -- DECLARE @StartDate date = CAST(@startDate AS DATE); -- Removed as parameters are passed via .input()
            -- DECLARE @EndDate   date = CAST(@endDate AS DATE);   -- Removed as parameters are passed via .input()

            ;WITH FIS AS (
                SELECT
                    OWHS.BPLId      AS [BranchId],
                    OINM.OutQty     AS [Qty],
                    OINM.Price      AS [Price],
                    OINM.Rate       AS [Rate],
                    OINM.Currency   AS [Currency]
                FROM OINM
                LEFT JOIN OITM ON OITM.ItemCode = OINM.ItemCode
                LEFT JOIN OWHS ON OWHS.WhsCode   = OINM.Warehouse
                LEFT JOIN OITB ON OITB.ItmsGrpCod = OITM.ItmsGrpCod
                WHERE
                    OITB.ItmsGrpCod = 111
                    AND OINM.TransType = 60
                    AND CAST(OINM.DocDate AS date) >= @StartDate
                    AND CAST(OINM.DocDate AS date) <= @EndDate
            )
            SELECT
                F.[BranchId],
                SUM(ISNULL(F.[Qty],0)) AS [Consumed],
                SUM(
                    ISNULL(F.[Qty],0) * ISNULL(
                        CASE WHEN F.[Currency] <> 'TRY'
                             THEN F.[Price] * NULLIF(F.[Rate],0)
                             ELSE F.[Price]
                        END, 0)
                ) AS [CostOfConsumed]
            FROM FIS F
            GROUP BY F.[BranchId]
            ORDER BY F.[BranchId]
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0])
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])
            .query(rawMaterialsQuery);
        
        // Process results to structure data for the frontend
        const processedData = {
            1: { Consumed: 0, CostOfConsumed: 0 }, // IZMIR
            3: { Consumed: 0, CostOfConsumed: 0 }, // URFA
            4: { Consumed: 0, CostOfConsumed: 0 }  // FLEX (though not explicitly in query, keep for consistency)
        };
        result.recordset.forEach(row => {
            const branchId = row.BranchId;
            processedData[branchId] = {
                Consumed: parseFloat(row.Consumed) || 0,
                CostOfConsumed: parseFloat(row.CostOfConsumed) || 0
            };
        });
        
        res.json(processedData);
        
    } catch (error) {
        console.error('Error fetching raw materials cost data:', error);
        res.status(500).json({ error: 'Failed to fetch raw materials cost data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});
 
// Helper function to fetch expense data for a given account prefix
async function fetchExpenseData(req, res, accountPrefix, endpointName) {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
        const expenseQuery = `
            SELECT
                T0.[BPLId],
                SUM(T0.[Debit] - T0.[Credit]) as TotalExpense
            FROM [dbo].[JDT1] T0
            WHERE T0.[RefDate] >= CAST(@startDate AS DATE)
                AND T0.[RefDate] <= CAST(@endDate AS DATE)
                AND T0.[TransType] <> '-3'
                AND (T0.[SourceLine] <> -8 OR T0.[SourceLine] IS NULL)
                AND T0.[BPLId] IN (1, 3, 4)
                AND T0.[Account] LIKE @accountPrefix
            GROUP BY T0.[BPLId]
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0]) // Format to YYYY-MM-DD
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])     // Format to YYYY-MM-DD
            .input('accountPrefix', sql.NVarChar, accountPrefix)
            .query(expenseQuery);
        
        const processedData = {
            1: 0, // IZMIR
            3: 0, // URFA
            4: 0  // FLEX
        };
        result.recordset.forEach(row => {
            const branchId = row.BPLId;
            processedData[branchId] = parseFloat(row.TotalExpense) || 0;
        });
        
        res.json(processedData);
        
    } catch (error) {
        console.error(`Error fetching ${endpointName}:`, error);
        res.status(500).json({ error: `Failed to fetch ${endpointName}`, details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// API endpoint for FLEX raw material cost
app.get('/api/flex-raw-material', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const flexRawMaterialQuery = `
            SELECT
                SUM(J1.Debit - J1.Credit) AS Total
            FROM OJDT J
            INNER JOIN JDT1 J1 ON J.TransId = J1.TransId
            WHERE
                J1.BPLId = 4
                AND J.RefDate >= @startDate AND J.RefDate <= @endDate
                AND (
                    J1.Account LIKE '620-01%' OR
                    J1.Account LIKE '895-01%'
                );
        `;

        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0])
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])
            .query(flexRawMaterialQuery);

        const total = result.recordset[0] ? result.recordset[0].Total : 0;
        
        // Data is only for FLEX (BranchId 4)
        const processedData = {
            1: 0,
            3: 0,
            4: parseFloat(total) || 0
        };
        
        res.json(processedData);

    } catch (error) {
        console.error('Error fetching FLEX raw material data:', error);
        res.status(500).json({ error: 'Failed to fetch FLEX raw material data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

// API endpoint to fetch XPET TRAY PURCHASES for IZMIR
app.get('/api/xpet-tray-purchases', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const xpetQuery = `
            SELECT 
                SUM(J1.Debit - J1.Credit) as Total
            FROM 
                OJDT AS J 
                INNER JOIN JDT1 AS J1 ON J.TransId = J1.TransId
            WHERE 
                J.TransType = 18
                AND J1.Account = '153-01-0004'
                AND J.RefDate >= @startDate
                AND J.RefDate <= @endDate
                AND J1.BPLId = 1
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0])
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])
            .query(xpetQuery);

        const total = result.recordset[0] ? result.recordset[0].Total : 0;
        
        // This query is only for IZMIR (BranchId 1), so we return data in that structure
        const processedData = {
            1: parseFloat(total) || 0,
            3: 0,
            4: 0
        };
// API endpoint to fetch XPET ROLL PURCHASES for IZMIR
app.get('/api/xpet-roll-purchases', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const xpetRollQuery = `
            SELECT 
                SUM(J1.Credit - J1.Debit) / 1.20 as Total
            FROM 
                OJDT AS J 
                INNER JOIN JDT1 AS J1 ON J.TransId = J1.TransId
            WHERE 
                ((J1.ShortName = 'T012274' AND (J.TransType = 19 OR J.TransType = 18)) OR (J1.ShortName = 'T013833' AND J1.ContraAct='891-01-0001'))
                AND J.RefDate >= @startDate
                AND J.RefDate <= @endDate
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0])
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])
            .query(xpetRollQuery);
        
        const total = result.recordset[0] ? result.recordset[0].Total : 0;
        
        // This query is only for IZMIR (BranchId 1), so we return data in that structure
        const processedData = {
            1: parseFloat(total) || 0,
            3: 0,
            4: 0
        };

// API endpoint to fetch XPET PAD PURCHASES for IZMIR
app.get('/api/xpet-pad-purchases', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const xpetPadQuery = `
            SELECT 
                SUM(J1.Credit - J1.Debit) / 1.20 as Total
            FROM 
                OJDT AS J 
                INNER JOIN JDT1 AS J1 ON J.TransId = J1.TransId
            WHERE 
                J1.ShortName = 'T010748'
                AND (J.TransType = 19 OR J.TransType = 18)
                AND J.RefDate >= @startDate
                AND J.RefDate <= @endDate
        `;
        
        const result = await pool.request()
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0])
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])
            .query(xpetPadQuery);
        
        const total = result.recordset[0] ? result.recordset[0].Total : 0;
        
        const processedData = {
            1: parseFloat(total) || 0,
            3: 0,
            4: 0
        };

        res.json(processedData);

// API endpoint for Live Expense Tracker
app.get('/api/live-expenses', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveExpensesQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);

            -- Derive period bounds for averages
            DECLARE @MonthStart date      = @StartDate;
            DECLARE @PrevMonthEnd date    = DATEADD(DAY, -1, @MonthStart);
            DECLARE @L3Start date         = DATEADD(MONTH, -3, @MonthStart);
            DECLARE @L6Start date         = DATEADD(MONTH, -6, @MonthStart);

            WITH Base AS (
                SELECT
                    J1.Account,
                    A.AcctName,
                    LEFT(J1.Account, 3) AS AccountGroup,
                    J.RefDate,
                    (J1.Debit - J1.Credit) AS Amount
                FROM OJDT J
                INNER JOIN JDT1 J1 ON J.TransId = J1.TransId
                INNER JOIN OACT A  ON J1.Account = A.AcctCode
                WHERE
                    (
                        J1.Account LIKE '720-%' OR
                        J1.Account LIKE '730-%' OR
                        J1.Account LIKE '760-%' OR
                        J1.Account LIKE '770-%'
                    )
                    AND J1.BPLId = 1
                    AND J.RefDate >= @L6Start
                    AND J.RefDate <= @EndDate
            )
            SELECT
                AccountGroup,
                Account,
                AcctName AS AccountName,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 6.0 AS Last6M_Avg,
                CASE 
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 0 THEN 'Detail'
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 1 THEN 'Subtotal'
                    ELSE 'Grand Total'
                END AS LineType
            FROM Base
            GROUP BY 
                GROUPING SETS (
                    (AccountGroup, Account, AcctName),
                    (AccountGroup),
                    ()
                )
            ORDER BY
                CASE WHEN AccountGroup IS NULL THEN 1 ELSE 0 END,
                AccountGroup,
                CASE 
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 0 THEN 0
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 1 THEN 1
                    ELSE 2
                END,
                Account;
        `;
        
        const result = await pool.request().query(liveExpensesQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live expenses data:', error);
        res.status(500).json({ error: 'Failed to fetch live expenses data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get('/api/live-expenses-urfa', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveExpensesQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);

            -- Derive period bounds for averages
            DECLARE @MonthStart date      = @StartDate;
            DECLARE @PrevMonthEnd date    = DATEADD(DAY, -1, @MonthStart);
            DECLARE @L3Start date         = DATEADD(MONTH, -3, @MonthStart);
            DECLARE @L6Start date         = DATEADD(MONTH, -6, @MonthStart);

            WITH Base AS (
                SELECT
                    J1.Account,
                    A.AcctName,
                    LEFT(J1.Account, 3) AS AccountGroup,
                    J.RefDate,
                    (J1.Debit - J1.Credit) AS Amount
                FROM OJDT J
                INNER JOIN JDT1 J1 ON J.TransId = J1.TransId
                INNER JOIN OACT A  ON J1.Account = A.AcctCode
                WHERE
                    (
                        J1.Account LIKE '720-%' OR
                        J1.Account LIKE '730-%' OR
                        J1.Account LIKE '760-%' OR
                        J1.Account LIKE '770-%'
                    )
                    AND J1.BPLId = 3
                    AND J.RefDate >= @L6Start
                    AND J.RefDate <= @EndDate
            )
            SELECT
                AccountGroup,
                Account,
                AcctName AS AccountName,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 6.0 AS Last6M_Avg,
                CASE
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 0 THEN 'Detail'
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 1 THEN 'Subtotal'
                    ELSE 'Grand Total'
                END AS LineType
            FROM Base
            GROUP BY
                GROUPING SETS (
                    (AccountGroup, Account, AcctName),
                    (AccountGroup),
                    ()
                )
            ORDER BY
                CASE WHEN AccountGroup IS NULL THEN 1 ELSE 0 END,
                AccountGroup,
                CASE
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 0 THEN 0
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 1 THEN 1
                    ELSE 2
                END,
                Account;
        `;
        
        const result = await pool.request().query(liveExpensesQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live expenses data for URFA:', error);
        res.status(500).json({ error: 'Failed to fetch live expenses data for URFA', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get('/api/live-raw-materials', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveRawMaterialsQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);
            DECLARE @PrevMonthEnd date = DATEADD(DAY, -1, @StartDate);
            DECLARE @L3Start date = DATEADD(MONTH, -3, @StartDate);
            DECLARE @L6Start date = DATEADD(MONTH, -6, @StartDate);

            WITH RawMaterials AS (
                -- XPET TRAY
                SELECT
                    'XPET TRAY PURCHASES' AS PurchaseType,
                    J.RefDate,
                    (J1.Debit - J1.Credit) AS Amount
                FROM OJDT AS J
                INNER JOIN JDT1 AS J1 ON J.TransId = J1.TransId
                WHERE J.TransType = 18
                    AND J1.Account = '153-01-0004'
                    AND J.RefDate >= @L6Start AND J.RefDate <= @EndDate
                    AND J1.BPLId = 1
                
                UNION ALL

                -- XPET ROLL
                SELECT
                    'XPET ROLL PURCHASES' AS PurchaseType,
                    J.RefDate,
                    (J1.Credit - J1.Debit) / 1.20 AS Amount
                FROM OJDT AS J
                INNER JOIN JDT1 AS J1 ON J.TransId = J1.TransId
                WHERE ((J1.ShortName = 'T012274' AND (J.TransType = 19 OR J.TransType = 18)) OR (J1.ShortName = 'T013833' AND J1.ContraAct='891-01-0001'))
                    AND J.RefDate >= @L6Start AND J.RefDate <= @EndDate

                UNION ALL

                -- XPET PAD
                SELECT
                    'XPET PAD PURCHASES' AS PurchaseType,
                    J.RefDate,
                    (J1.Credit - J1.Debit) / 1.20 AS Amount
                FROM OJDT AS J
                INNER JOIN JDT1 AS J1 ON J.TransId = J1.TransId
                WHERE J1.ShortName = 'T010748'
                    AND (J.TransType = 19 OR J.TransType = 18)
                    AND J.RefDate >= @L6Start AND J.RefDate <= @EndDate
                
                UNION ALL

                -- Raw Mat. (+40%)
                SELECT
                    'Raw Mat. (+40%)' AS PurchaseType,
                    OINM.DocDate AS RefDate,
                    (
                        OINM.OutQty * ISNULL(
                            CASE
                                WHEN OINM.Currency <> 'TRY' THEN OINM.Price * NULLIF(OINM.Rate, 0)
                                ELSE OINM.Price
                            END, 0)
                    ) * 1.40 AS Amount
                FROM OINM
                LEFT JOIN OITM ON OITM.ItemCode = OINM.ItemCode
                LEFT JOIN OWHS ON OWHS.WhsCode   = OINM.Warehouse
                LEFT JOIN OITB ON OITB.ItmsGrpCod = OITM.ItmsGrpCod
                WHERE
                    OITB.ItmsGrpCod = 111
                    AND OINM.TransType = 60
                    AND OWHS.BPLId = 1
                    AND CAST(OINM.DocDate AS date) >= @L6Start
                    AND CAST(OINM.DocDate AS date) <= @EndDate
            )
            SELECT
                PurchaseType,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 6.0 AS Last6M_Avg
            FROM RawMaterials
            GROUP BY PurchaseType
            ORDER BY PurchaseType;
        `;
        
        const result = await pool.request().query(liveRawMaterialsQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live raw materials data:', error);
        res.status(500).json({ error: 'Failed to fetch live raw materials data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get('/api/live-raw-materials-urfa', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveRawMaterialsQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);
            DECLARE @PrevMonthEnd date = DATEADD(DAY, -1, @StartDate);
            DECLARE @L3Start date = DATEADD(MONTH, -3, @StartDate);
            DECLARE @L6Start date = DATEADD(MONTH, -6, @StartDate);

            WITH RawMaterials AS (
                -- Raw Mat. (+20%)
                SELECT
                    'Raw Mat. (+20%)' AS PurchaseType,
                    OINM.DocDate AS RefDate,
                    (
                        OINM.OutQty * ISNULL(
                            CASE
                                WHEN OINM.Currency <> 'TRY' THEN OINM.Price * NULLIF(OINM.Rate, 0)
                                ELSE OINM.Price
                            END, 0)
                    ) * 1.20 AS Amount
                FROM OINM
                LEFT JOIN OITM ON OITM.ItemCode = OINM.ItemCode
                LEFT JOIN OWHS ON OWHS.WhsCode   = OINM.Warehouse
                LEFT JOIN OITB ON OITB.ItmsGrpCod = OITM.ItmsGrpCod
                WHERE
                    OITB.ItmsGrpCod = 111
                    AND OINM.TransType = 60
                    AND OWHS.BPLId = 3
                    AND CAST(OINM.DocDate AS date) >= @L6Start
                    AND CAST(OINM.DocDate AS date) <= @EndDate
            )
            SELECT
                PurchaseType,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 6.0 AS Last6M_Avg
            FROM RawMaterials
            GROUP BY PurchaseType
            ORDER BY PurchaseType;
        `;
        
        const result = await pool.request().query(liveRawMaterialsQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live raw materials data for URFA:', error);
        res.status(500).json({ error: 'Failed to fetch live raw materials data for URFA', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get('/api/live-expenses-flex', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveExpensesQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);

            -- Derive period bounds for averages
            DECLARE @MonthStart date      = @StartDate;
            DECLARE @PrevMonthEnd date    = DATEADD(DAY, -1, @MonthStart);
            DECLARE @L3Start date         = DATEADD(MONTH, -3, @MonthStart);
            DECLARE @L6Start date         = DATEADD(MONTH, -6, @MonthStart);

            WITH Base AS (
                SELECT
                    J1.Account,
                    A.AcctName,
                    LEFT(J1.Account, 3) AS AccountGroup,
                    J.RefDate,
                    (J1.Debit - J1.Credit) AS Amount
                FROM OJDT J
                INNER JOIN JDT1 J1 ON J.TransId = J1.TransId
                INNER JOIN OACT A  ON J1.Account = A.AcctCode
                WHERE
                    (
                        J1.Account LIKE '720-%' OR
                        J1.Account LIKE '730-%' OR
                        J1.Account LIKE '760-%' OR
                        J1.Account LIKE '770-%'
                    )
                    AND J1.BPLId = 4
                    AND J.RefDate >= @L6Start
                    AND J.RefDate <= @EndDate
            )
            SELECT
                AccountGroup,
                Account,
                AcctName AS AccountName,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 6.0 AS Last6M_Avg,
                CASE
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 0 THEN 'Detail'
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 1 THEN 'Subtotal'
                    ELSE 'Grand Total'
                END AS LineType
            FROM Base
            GROUP BY
                GROUPING SETS (
                    (AccountGroup, Account, AcctName),
                    (AccountGroup),
                    ()
                )
            ORDER BY
                CASE WHEN AccountGroup IS NULL THEN 1 ELSE 0 END,
                AccountGroup,
                CASE
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 0 THEN 0
                    WHEN GROUPING(AccountGroup) = 0 AND GROUPING(Account) = 1 THEN 1
                    ELSE 2
                END,
                Account;
        `;
        
        const result = await pool.request().query(liveExpensesQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live expenses data for FLEX:', error);
        res.status(500).json({ error: 'Failed to fetch live expenses data for FLEX', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get('/api/live-raw-materials-flex', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveRawMaterialsQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);
            DECLARE @PrevMonthEnd date = DATEADD(DAY, -1, @StartDate);
            DECLARE @L3Start date = DATEADD(MONTH, -3, @StartDate);
            DECLARE @L6Start date = DATEADD(MONTH, -6, @StartDate);

            WITH RawMaterials AS (
                SELECT
                    'Raw Material' AS PurchaseType,
                    J.RefDate,
                    (J1.Debit - J1.Credit) AS Amount
                FROM OJDT J
                INNER JOIN JDT1 J1 ON J.TransId = J1.TransId
                WHERE
                    J1.BPLId = 4
                    AND J.RefDate >= @L6Start AND J.RefDate <= @EndDate
                    AND (
                        J1.Account LIKE '620-01%' OR
                        J1.Account LIKE '895-01%'
                    )
            )
            SELECT
                PurchaseType,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @PrevMonthEnd THEN Amount END), 0) / 6.0 AS Last6M_Avg
            FROM RawMaterials
            GROUP BY PurchaseType
            ORDER BY PurchaseType;
        `;
        
        const result = await pool.request().query(liveRawMaterialsQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live raw materials data for FLEX:', error);
        res.status(500).json({ error: 'Failed to fetch live raw materials data for FLEX', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});
    } catch (error) {
        console.error('Error fetching XPET PAD PURCHASES data:', error);
        res.status(500).json({ error: 'Failed to fetch XPET PAD PURCHASES data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});
        res.json(processedData);

    } catch (error) {
        console.error('Error fetching XPET ROLL PURCHASES data:', error);
        res.status(500).json({ error: 'Failed to fetch XPET ROLL PURCHASES data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

        res.json(processedData);

    } catch (error) {
        console.error('Error fetching XPET TRAY PURCHASES data:', error);
        res.status(500).json({ error: 'Failed to fetch XPET TRAY PURCHASES data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});
// API endpoint to fetch average USD currency rate
app.get('/api/avg-usd-currency', async (req, res) => {
    //const { startDate, endDate } = req.query; // Although query uses GETDATE(), keeping for consistency if needed
    
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
        const avgUsdCurrencyQuery = `
            SELECT
                O.Currency,
                CONVERT(char(7), O.RateDate, 120) AS [Year-Month],  -- yyyy-MM
                AVG(CAST(O.Rate AS decimal(19,6)))  AS [AVG]
            FROM ORTT O
            WHERE O.RateDate >= DATEADD(MONTH,-9,GETDATE())
              AND O.Currency IN ('USD')
            GROUP BY O.Currency, CONVERT(char(7), O.RateDate, 120)
            ORDER BY O.Currency, [Year-Month]
        `;
        
        const result = await pool.request().query(avgUsdCurrencyQuery);
        
        console.log('AVG USD Currency Query Recordset:', result.recordset); // Debugging line

        // Process results to map by Year-Month for easy lookup
        const processedData = {};
        result.recordset.forEach(row => {
            processedData[row['Year-Month']] = parseFloat(row.AVG) || 0;
        });
        
        console.log('AVG USD Currency Processed Data:', processedData); // Debugging line
        res.json(processedData);
        
    } catch (error) {
        console.error('Error fetching average USD currency data:', error);
        res.status(500).json({ error: 'Failed to fetch average USD currency data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});
 
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'CEO Income Dashboard API is running' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`CEO Income Dashboard server running on http://localhost:${PORT}`);
    console.log('Make sure to create config.local.js with your actual SQL Server credentials');
});

module.exports = app;