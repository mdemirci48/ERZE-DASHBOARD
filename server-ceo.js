const express = require('express');
const sql = require('mssql');
const path = require('path');
const session = require('express-session');
const app = express();

// Load configuration
let config;
try {
    config = require('./config.local.js');
    console.log('Loaded local configuration from config.local.js');
} catch (error) {
    config = require('./config.js');
    console.log('Using default configuration from config.js');
}

const sqlConfig = config.sqlServer;
const PORT = 3001; // CEO server runs on port 3001

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        return next();
    }
    res.redirect('/login');
}

// Protect all API routes with authentication
app.use('/api', requireAuth);

// ============================================================================
// CEO DASHBOARD ENDPOINTS
// ============================================================================

// API endpoint for Live Raw Materials - IZMIR
app.get('/api/live-raw-materials', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveRawMaterialsQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);
            
            DECLARE @L3Start date = DATEADD(MONTH, -4, @StartDate);
            DECLARE @L3End date = EOMONTH(DATEADD(MONTH, 2, @L3Start));
            DECLARE @L6Start date = DATEADD(MONTH, -7, @StartDate);
            DECLARE @L6End date = EOMONTH(DATEADD(MONTH, 5, @L6Start));

            WITH RawMaterials AS (
                -- XPET TRAY
                SELECT
                    'XPET TRAY PURCHASES' AS PurchaseType,
                    J.RefDate,
                    0.0 AS Qty,
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
                    0.0 AS Qty,
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
                    0.0 AS Qty,
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
                    OINM.OutQty AS Qty,
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
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @L3End THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @L6End THEN Amount END), 0) / 6.0 AS Last6M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Qty END), 0) AS ConsumedQty
            FROM RawMaterials
            GROUP BY PurchaseType
            ORDER BY PurchaseType;
        `;
        
        const result = await pool.request().query(liveRawMaterialsQuery);
        res.json(result.recordset);

    } catch (error) {
        console.error('Error fetching live raw materials data for IZMIR:', error);
        res.status(500).json({ error: 'Failed to fetch live raw materials data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

// API endpoint for Live Raw Materials - URFA
app.get('/api/live-raw-materials-urfa', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveRawMaterialsQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);
            
            DECLARE @L3Start date = DATEADD(MONTH, -4, @StartDate);
            DECLARE @L3End date = EOMONTH(DATEADD(MONTH, 2, @L3Start));
            DECLARE @L6Start date = DATEADD(MONTH, -7, @StartDate);
            DECLARE @L6End date = EOMONTH(DATEADD(MONTH, 5, @L6Start));

            WITH RawMaterials AS (
                -- Raw Mat. (+20%)
                SELECT
                    'Raw Mat. (+20%)' AS PurchaseType,
                    OINM.DocDate AS RefDate,
                    OINM.OutQty AS Qty,
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
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @L3End THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @L6End THEN Amount END), 0) / 6.0 AS Last6M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Qty END), 0) AS ConsumedQty
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

// API endpoint for Live Raw Materials - FLEX
app.get('/api/live-raw-materials-flex', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveRawMaterialsQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);
            
            DECLARE @L3Start date = DATEADD(MONTH, -4, @StartDate);
            DECLARE @L3End date = EOMONTH(DATEADD(MONTH, 2, @L3Start));
            DECLARE @L6Start date = DATEADD(MONTH, -7, @StartDate);
            DECLARE @L6End date = EOMONTH(DATEADD(MONTH, 5, @L6Start));

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
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @L3End THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @L6End THEN Amount END), 0) / 6.0 AS Last6M_Avg
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

// API endpoint for Live Expenses - IZMIR
app.get('/api/live-expenses', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveExpensesQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);

            -- Derive period bounds for averages
            DECLARE @MonthStart date      = @StartDate;
            
            DECLARE @L3Start date = DATEADD(MONTH, -4, @StartDate);
            DECLARE @L3End date = EOMONTH(DATEADD(MONTH, 2, @L3Start));
            DECLARE @L6Start date = DATEADD(MONTH, -7, @StartDate);
            DECLARE @L6End date = EOMONTH(DATEADD(MONTH, 5, @L6Start));

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
                    AND J1.Account NOT IN ('730-01-0010', '770-01-0026') -- Exclude amortisman
            )
            SELECT
                AccountGroup,
                Account,
                AcctName AS AccountName,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @L3End THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @L6End THEN Amount END), 0) / 6.0 AS Last6M_Avg,
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
        console.error('Error fetching live expenses data for IZMIR:', error);
        res.status(500).json({ error: 'Failed to fetch live expenses data', details: error.message });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

// API endpoint for Live Expenses - URFA
app.get('/api/live-expenses-urfa', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveExpensesQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);

            -- Derive period bounds for averages
            DECLARE @MonthStart date      = @StartDate;
            
            DECLARE @L3Start date = DATEADD(MONTH, -4, @StartDate);
            DECLARE @L3End date = EOMONTH(DATEADD(MONTH, 2, @L3Start));
            DECLARE @L6Start date = DATEADD(MONTH, -7, @StartDate);
            DECLARE @L6End date = EOMONTH(DATEADD(MONTH, 5, @L6Start));

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
                    AND J1.Account NOT IN ('730-01-0010', '770-01-0026') -- Exclude amortisman
            )
            SELECT
                AccountGroup,
                Account,
                AcctName AS AccountName,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @L3End THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @L6End THEN Amount END), 0) / 6.0 AS Last6M_Avg,
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

// API endpoint for Live Expenses - FLEX
app.get('/api/live-expenses-flex', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);

        const liveExpensesQuery = `
            DECLARE @StartDate date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1);
            DECLARE @EndDate   date = EOMONTH(@StartDate);

            -- Derive period bounds for averages
            DECLARE @MonthStart date      = @StartDate;
            
            DECLARE @L3Start date = DATEADD(MONTH, -4, @StartDate);
            DECLARE @L3End date = EOMONTH(DATEADD(MONTH, 2, @L3Start));
            DECLARE @L6Start date = DATEADD(MONTH, -7, @StartDate);
            DECLARE @L6End date = EOMONTH(DATEADD(MONTH, 5, @L6Start));

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
                    AND J1.Account NOT IN ('730-01-0010', '770-01-0026') -- Exclude amortisman
            )
            SELECT
                AccountGroup,
                Account,
                AcctName AS AccountName,
                COALESCE(SUM(CASE WHEN RefDate >= @StartDate AND RefDate <= @EndDate THEN Amount END), 0) AS Total,
                COALESCE(SUM(CASE WHEN RefDate >= @L3Start AND RefDate <= @L3End THEN Amount END), 0) / 3.0 AS Last3M_Avg,
                COALESCE(SUM(CASE WHEN RefDate >= @L6Start AND RefDate <= @L6End THEN Amount END), 0) / 6.0 AS Last6M_Avg,
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

// API endpoint to fetch income data by account type and branch
app.get('/api/income-summary', async (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        
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
            .input('startDate', sql.Date, new Date(startDate).toISOString().split('T')[0])
            .input('endDate', sql.Date, new Date(endDate).toISOString().split('T')[0])
            .query(summaryQuery);
        
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

// ============================================================================
// AUTHENTICATION & STATIC ROUTES
// ============================================================================

// Login routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', async (req, res) => {
    const { password } = req.body;
    const correctPassword = config.password || 'admin123';
    const ceoPassword = config.ceoPassword || 'ceopassword';

    if (password === correctPassword) {
        req.session.authenticated = true;
        res.redirect('/');
    } else if (password === ceoPassword) {
        req.session.authenticated = true;
        res.redirect('/ceo-dashboard');
    } else {
        res.send('Invalid password. <a href="/login">Try again</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Serve the CEO dashboard
app.get('/ceo-dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'ceo-dashboard.html'));
});

// Serve the main HTML file
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'CEO Dashboard Server is running' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`CEO Dashboard server running on http://localhost:${PORT}`);
    console.log('Endpoints available:');
    console.log('  - /api/live-raw-materials (IZMIR)');
    console.log('  - /api/live-raw-materials-urfa (URFA)');
    console.log('  - /api/live-raw-materials-flex (FLEX)');
    console.log('  - /api/live-expenses (IZMIR)');
    console.log('  - /api/live-expenses-urfa (URFA)');
    console.log('  - /api/live-expenses-flex (FLEX)');
    console.log('  - /api/income-summary');
    console.log('Make sure to create config.local.js with your actual SQL Server credentials');
});

module.exports = app;