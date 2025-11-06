// Authentication check
async function checkAuthentication() {
    try {
        const response = await fetch('/api/income-summary?startDate=2024-01-01&endDate=2024-01-01');
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Authentication check failed:', error);
        return true; // Allow to proceed if check fails
    }
}

// Current date tracking
let currentDate = new Date();

// DOM Elements
const pnlTableHead = document.querySelector('#pnl-table thead');
const pnlTableBody = document.getElementById('pnl-table-body');
const loadingIndicator = document.getElementById('loading');
const errorContainer = document.getElementById('error');
const errorText = document.getElementById('error-text');
const currentPeriodElement = document.getElementById('current-period');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const refreshBtn = document.getElementById('refresh-data');

// Branch mapping for display
const branchNames = {
    1: 'IZMIR',
    3: 'URFA',
    4: 'FLEX'
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    updatePeriodDisplay();
    fetchDataForCurrentPeriod();
    
    // Event listeners
    prevMonthBtn.addEventListener('click', goToPreviousMonth);
    nextMonthBtn.addEventListener('click', goToNextMonth);
    refreshBtn.addEventListener('click', fetchDataForCurrentPeriod);
});

// Update the period display
function updatePeriodDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthLabels = [];
    for (let i = 0; i < 4; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        monthLabels.push(`${month} ${year}`);
    }
    
    currentPeriodElement.textContent = `P&L Data: ${monthLabels[0]} to ${monthLabels[3]}`;
}

// Navigate to previous month
function goToPreviousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updatePeriodDisplay();
    fetchDataForCurrentPeriod();
}

// Navigate to next month (but not beyond current month)
function goToNextMonth() {
    const now = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    
    if (nextMonth <= now) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updatePeriodDisplay();
        fetchDataForCurrentPeriod();
    }
}

// Fetch data for the current period
async function fetchDataForCurrentPeriod() {
    showLoading();
    hideError();
    
    try {
        const dateRanges = getDateRanges();
        
        const allMonthlyNetIncomeData = await Promise.all([
            fetchNetIncomeSummary(dateRanges.current.start, dateRanges.current.end),
            fetchNetIncomeSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchNetIncomeSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchNetIncomeSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchNetIncomeSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyExpense720Data = await Promise.all([
            fetchExpense720Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense720Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense720Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense720Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense720Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyExpense730Data = await Promise.all([
            fetchExpense730Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense730Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense730Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense730Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense730Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyExpense760Data = await Promise.all([
            fetchExpense760Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense760Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense760Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense760Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense760Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyExpense770Data = await Promise.all([
            fetchExpense770Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense770Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense770Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense770Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense770Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);


        const allMonthlyRawMaterialsData = await Promise.all([
            fetchRawMaterialsCostSummary(dateRanges.current.start, dateRanges.current.end),
            fetchRawMaterialsCostSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchRawMaterialsCostSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchRawMaterialsCostSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchRawMaterialsCostSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyFlexRawMaterialData = await Promise.all([
            fetchFlexRawMaterialSummary(dateRanges.current.start, dateRanges.current.end),
            fetchFlexRawMaterialSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchFlexRawMaterialSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchFlexRawMaterialSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchFlexRawMaterialSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        
        const allMonthlyXpetData = await Promise.all([
            fetchXpetTrayPurchasesSummary(dateRanges.current.start, dateRanges.current.end),
            fetchXpetTrayPurchasesSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchXpetTrayPurchasesSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchXpetTrayPurchasesSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchXpetTrayPurchasesSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyXpetRollData = await Promise.all([
            fetchXpetRollPurchasesSummary(dateRanges.current.start, dateRanges.current.end),
            fetchXpetRollPurchasesSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchXpetRollPurchasesSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchXpetRollPurchasesSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchXpetRollPurchasesSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        const allMonthlyXpetPadData = await Promise.all([
            fetchXpetPadPurchasesSummary(dateRanges.current.start, dateRanges.current.end),
            fetchXpetPadPurchasesSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchXpetPadPurchasesSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchXpetPadPurchasesSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchXpetPadPurchasesSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);

        processAndDisplayPnlTable(
            allMonthlyNetIncomeData,
            allMonthlyExpense720Data,
            allMonthlyExpense730Data,
            allMonthlyExpense760Data,
            allMonthlyExpense770Data,
            allMonthlyRawMaterialsData,
            allMonthlyFlexRawMaterialData,
            allMonthlyXpetData,
            allMonthlyXpetRollData,
            allMonthlyXpetPadData
        );
        
    } catch (error) {
        showError('Failed to fetch data: ' + error.message);
        console.error('Error fetching data:', error);
    } finally {
        hideLoading();
    }
}

// Get date ranges for current month and previous 3 months
function getDateRanges() {
    const ranges = {};
    
    let tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    ranges.current = getMonthDateRange(new Date(tempDate));

    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month1 = getMonthDateRange(new Date(tempDate));

    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month2 = getMonthDateRange(new Date(tempDate));

    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month3 = getMonthDateRange(new Date(tempDate));

    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month4 = getMonthDateRange(new Date(tempDate));
    
    return ranges;
}

// Get start and end dates for a given month
function getMonthDateRange(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// Fetch net income summary data
async function fetchNetIncomeSummary(startDate, endDate) {
    const response = await fetch(`/api/income-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// Fetch expense data for 720- accounts
async function fetchExpense720Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-720-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// Fetch expense data for 730- accounts
async function fetchExpense730Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-730-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// Fetch expense data for 760- accounts
async function fetchExpense760Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-760-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// Fetch expense data for 770- accounts
async function fetchExpense770Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-770-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}


async function fetchRawMaterialsCostSummary(startDate, endDate) {
    const response = await fetch(`/api/raw-materials-cost-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchXpetTrayPurchasesSummary(startDate, endDate) {
    const response = await fetch(`/api/xpet-tray-purchases?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchXpetRollPurchasesSummary(startDate, endDate) {
    const response = await fetch(`/api/xpet-roll-purchases?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchXpetPadPurchasesSummary(startDate, endDate) {
    const response = await fetch(`/api/xpet-pad-purchases?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function fetchFlexRawMaterialSummary(startDate, endDate) {
    const response = await fetch(`/api/flex-raw-material?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

function processAndDisplayPnlTable(income, allMonthlyExpense720Data, allMonthlyExpense730Data, allMonthlyExpense760Data, allMonthlyExpense770Data, allMonthlyRawMaterialsData, allMonthlyFlexRawMaterialData, allMonthlyXpetData, allMonthlyXpetRollData, allMonthlyXpetPadData) {
    pnlTableHead.innerHTML = '';
    pnlTableBody.innerHTML = '';

    const expenses = [allMonthlyExpense720Data, allMonthlyExpense730Data, allMonthlyExpense760Data, allMonthlyExpense770Data];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const branchOrder = [1, 3, 4];
    const displayBranchNames = branchOrder.map(id => branchNames[id]);

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>Month</th>${displayBranchNames.map(name => `<th>${name}</th>`).join('')}<th>TOTAL</th>`;
    pnlTableHead.appendChild(headerRow);

    const rowsData = [];
    const branchDetails = { 1: [], 3: [], 4: [] };

    for (let i = 0; i < income.length; i++) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
        
        let monthTotal = 0;
        const branchValues = {};

        branchOrder.forEach(branchId => {
            const incomeAmount = income[i][branchId] || 0;
            
            const expense720 = allMonthlyExpense720Data[i] && allMonthlyExpense720Data[i][branchId] ? Math.abs(allMonthlyExpense720Data[i][branchId]) : 0;
            const expense730 = allMonthlyExpense730Data[i] && allMonthlyExpense730Data[i][branchId] ? Math.abs(allMonthlyExpense730Data[i][branchId]) : 0;
            const expense760 = allMonthlyExpense760Data[i] && allMonthlyExpense760Data[i][branchId] ? Math.abs(allMonthlyExpense760Data[i][branchId]) : 0;
            const expense770 = allMonthlyExpense770Data[i] && allMonthlyExpense770Data[i][branchId] ? Math.abs(allMonthlyExpense770Data[i][branchId]) : 0;

            const rawMaterialsMonthData = allMonthlyRawMaterialsData[i];
            let rawMaterialCost = 0;
            if (rawMaterialsMonthData && rawMaterialsMonthData[branchId]) {
                const baseRmCost = parseFloat(rawMaterialsMonthData[branchId].CostOfConsumed) || 0;
                if (branchId === 1) { // IZMIR
                    rawMaterialCost = baseRmCost * 1.40;
                } else if (branchId === 3) { // URFA
                    rawMaterialCost = baseRmCost * 1.20;
                } else if (branchId === 4) { // FLEX
                    const flexRawMaterial = allMonthlyFlexRawMaterialData[i] && allMonthlyFlexRawMaterialData[i][branchId] ? Math.abs(allMonthlyFlexRawMaterialData[i][branchId]) : 0;
                    rawMaterialCost = flexRawMaterial;
                } else {
                    rawMaterialCost = baseRmCost;
                }
            }

            const expense780 = 350000;
            const xpetTrayPurchases = allMonthlyXpetData[i] && allMonthlyXpetData[i][branchId] ? Math.abs(allMonthlyXpetData[i][branchId]) : 0;
            const xpetRollPurchases = allMonthlyXpetRollData[i] && allMonthlyXpetRollData[i][branchId] ? Math.abs(allMonthlyXpetRollData[i][branchId]) : 0;
            const xpetPadPurchases = allMonthlyXpetPadData[i] && allMonthlyXpetPadData[i][branchId] ? Math.abs(allMonthlyXpetPadData[i][branchId]) : 0;
            const totalExpenses = expense720 + expense730 + expense760 + expense770 + expense780 + rawMaterialCost + xpetTrayPurchases + xpetRollPurchases + xpetPadPurchases;
            const pnl = incomeAmount - totalExpenses;
            branchValues[branchId] = pnl;
            monthTotal += pnl;

            branchDetails[branchId].push({
                month: monthLabel,
                turnover: incomeAmount,
                expense720: expense720,
                expense730: expense730,
                expense760: expense760,
                expense770: expense770,
                expense780: expense780,
                rawMaterialCost: rawMaterialCost,
                xpetTrayPurchases: xpetTrayPurchases,
                xpetRollPurchases: xpetRollPurchases,
                xpetPadPurchases: xpetPadPurchases,
                totalExpenses: totalExpenses,
                pnl: pnl
            });

            console.log(
                `Month: ${monthLabel}, Branch: ${branchNames[branchId]}\n` +
                `  - Income: ${incomeAmount.toFixed(2)}\n` +
                `  - Total Expenses: ${totalExpenses.toFixed(2)}\n` +
                `    - Regular Expenses: ${(totalExpenses - rawMaterialCost).toFixed(2)}\n` +
                `    - Raw Material Cost: ${rawMaterialCost.toFixed(2)}\n` +
                `  - P&L: ${pnl.toFixed(2)}\n` +
                `---------------------------------`
            );
        });

        rowsData.push({
            label: monthLabel,
            values: branchValues,
            total: monthTotal
        });
    }

    rowsData.forEach(rowData => {
        const row = document.createElement('tr');
        let rowHtml = `<td>${rowData.label}</td>`;
        branchOrder.forEach(branchId => {
            rowHtml += `<td>${formatCurrency(rowData.values[branchId])}</td>`;
        });
        rowHtml += `<td>${formatCurrency(rowData.total)}</td>`;
        row.innerHTML = rowHtml;
        pnlTableBody.appendChild(row);
    });

    const l3maBranchTotals = { 1: 0, 3: 0, 4: 0 };
    let l3maOverallTotal = 0;
    
    if (rowsData.length >= 5) {
        for (let i = 2; i < 5; i++) {
            const monthData = rowsData[i];
            branchOrder.forEach(branchId => {
                l3maBranchTotals[branchId] += monthData.values[branchId];
            });
            l3maOverallTotal += monthData.total;
        }

        branchOrder.forEach(branchId => {
            l3maBranchTotals[branchId] /= 3;
        });
        l3maOverallTotal /= 3;
    }

    const l3maRow = document.createElement('tr');
    l3maRow.classList.add('l3ma-total');
    let l3maHtml = `<td>L3MA</td>`;
    branchOrder.forEach(branchId => {
        l3maHtml += `<td>${formatCurrency(l3maBranchTotals[branchId])}</td>`;
    });
    l3maHtml += `<td>${formatCurrency(l3maOverallTotal)}</td>`;
    l3maRow.innerHTML = l3maHtml;
    pnlTableBody.appendChild(l3maRow);

    // Process and display branch-specific P&L tables
    processAndDisplayBranchPnl(branchDetails);
}

// Show/Hide and format functions
function showLoading() {
    loadingIndicator.style.display = 'block';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    errorContainer.style.display = 'block';
}

function hideError() {
    errorContainer.style.display = 'none';
}

function formatCurrency(amount) {
    if (isNaN(amount)) return '0,00 ₺';
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function processAndDisplayBranchPnl(branchDetails) {
    const branchIds = {
        'izmir-pnl-table': 1,
        'urfa-pnl-table': 3,
        'flex-pnl-table': 4
    };

    const allExpenseKeys = [
        'expense720', 'expense730', 'expense760', 'expense770', 'expense780',
        'rawMaterialCost', 'xpetTrayPurchases', 'xpetRollPurchases', 'xpetPadPurchases'
    ];

    for (const tableId in branchIds) {
        const branchId = branchIds[tableId];
        const table = document.getElementById(tableId);
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Define Headers
        let rawMaterialHeader = 'Raw Mat.';
        if (branchId === 1) rawMaterialHeader = 'Raw Mat. (+40%)';
        else if (branchId === 3) rawMaterialHeader = 'Raw Mat. (+20%)';
        
        let headers = `<th>Month</th><th>Turnover</th><th>720</th><th>730</th><th>760</th><th>770</th><th>780</th><th>${rawMaterialHeader}</th>`;
        if (branchId === 1) {
            headers += `<th>XPET TRAY PURCHASES</th><th>XPET ROLL PURCHASES</th><th>XPET PAD PURCHASES</th>`;
        }
        headers += `<th>Total Exp.</th><th>P&L</th>`;
        
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = headers;
        thead.appendChild(headerRow);

        const branchData = branchDetails[branchId];
        if (!branchData) continue;

        // Calculate Averages if possible
        const averages = {};
        const canHighlight = branchData.length >= 4;
        if (branchData.length >= 5) {
            allExpenseKeys.forEach(key => {
                if (branchData[2][key] !== undefined) {
                    averages[key] = (branchData[2][key] + branchData[3][key] + branchData[4][key]) / 3;
                }
            });
        }

        // Build Rows
        branchData.forEach((data, i) => {
            const row = document.createElement('tr');
            let cells = `<td>${data.month}</td><td>${formatCurrency(data.turnover)}</td>`;

            const branchExpenseKeys = [
                'expense720', 'expense730', 'expense760', 'expense770',
                'expense780', 'rawMaterialCost'
            ];
            if (branchId === 1) {
                branchExpenseKeys.push('xpetTrayPurchases', 'xpetRollPurchases', 'xpetPadPurchases');
            }
            
            branchExpenseKeys.forEach(key => {
                const value = data[key];
                let highlightClass = '';
                // Apply highlighting only if we have enough data and it's not the current month
                if (canHighlight && i > 0) {
                    const avg = averages[key];
                    if (avg > 0) {
                        if (value > avg * 1.15) highlightClass = 'highlight-red';
                        else if (value < avg * 0.85) highlightClass = 'highlight-green';
                    }
                }
                cells += `<td class="${highlightClass}">${formatCurrency(value)}</td>`;
            });

            cells += `<td>${formatCurrency(data.totalExpenses)}</td><td>${formatCurrency(data.pnl)}</td>`;
            row.innerHTML = cells;
            tbody.appendChild(row);
        });
    }
}