// Current date tracking
let currentDate = new Date();

// DOM Elements
const incomeTableHead = document.querySelector('#income-table thead');
const incomeTableBody = document.getElementById('table-body');

const expense720TableHead = document.querySelector('#expense-720-table thead');
const expense720TableBody = document.getElementById('expense-720-table-body');
const expense730TableHead = document.querySelector('#expense-730-table thead');
const expense730TableBody = document.getElementById('expense-730-table-body');
const expense760TableHead = document.querySelector('#expense-760-table thead');
const expense760TableBody = document.getElementById('expense-760-table-body');
const expense770TableHead = document.querySelector('#expense-770-table thead');
const expense770TableBody = document.getElementById('expense-770-table-body');

const rawMaterialsTableHead = document.querySelector('#raw-materials-table thead');
const rawMaterialsTableBody = document.getElementById('raw-materials-table-body');
 
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
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Get the last 4 months including current
    const monthLabels = [];
    for (let i = 0; i < 4; i++) { // Still 4 months for display, but data fetching will be dynamic
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        monthLabels.push(`${month} ${year}`);
    }
    
    // Update the display to show the current period range
    currentPeriodElement.textContent = `Income/Expenses Data: ${monthLabels[0]} to ${monthLabels[3]}`;
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
        // Get the date ranges for the current month and previous 3 months
        const dateRanges = getDateRanges();
        
        // Fetch net income data for all periods
        const allMonthlyNetIncomeData = await Promise.all([
            fetchNetIncomeSummary(dateRanges.current.start, dateRanges.current.end),
            fetchNetIncomeSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchNetIncomeSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchNetIncomeSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchNetIncomeSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        
        // Process and display the income data
        processAndDisplayTable(incomeTableHead, incomeTableBody, allMonthlyNetIncomeData, 'income');

        // Fetch expense data for 720- accounts
        const allMonthlyExpense720Data = await Promise.all([
            fetchExpense720Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense720Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense720Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense720Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense720Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        processAndDisplayTable(expense720TableHead, expense720TableBody, allMonthlyExpense720Data, 'expense');

        // Fetch expense data for 730- accounts
        const allMonthlyExpense730Data = await Promise.all([
            fetchExpense730Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense730Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense730Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense730Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense730Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        processAndDisplayTable(expense730TableHead, expense730TableBody, allMonthlyExpense730Data, 'expense');

        // Fetch expense data for 760- accounts
        const allMonthlyExpense760Data = await Promise.all([
            fetchExpense760Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense760Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense760Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense760Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense760Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        processAndDisplayTable(expense760TableHead, expense760TableBody, allMonthlyExpense760Data, 'expense');

        // Fetch expense data for 770- accounts
        const allMonthlyExpense770Data = await Promise.all([
            fetchExpense770Summary(dateRanges.current.start, dateRanges.current.end),
            fetchExpense770Summary(dateRanges.month1.start, dateRanges.month1.end),
            fetchExpense770Summary(dateRanges.month2.start, dateRanges.month2.end),
            fetchExpense770Summary(dateRanges.month3.start, dateRanges.month3.end),
            fetchExpense770Summary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        processAndDisplayTable(expense770TableHead, expense770TableBody, allMonthlyExpense770Data, 'expense');


        // Fetch raw materials cost data for current and previous 3 months
        const allMonthlyRawMaterialsData = await Promise.all([
            fetchRawMaterialsCostSummary(dateRanges.current.start, dateRanges.current.end),
            fetchRawMaterialsCostSummary(dateRanges.month1.start, dateRanges.month1.end),
            fetchRawMaterialsCostSummary(dateRanges.month2.start, dateRanges.month2.end),
            fetchRawMaterialsCostSummary(dateRanges.month3.start, dateRanges.month3.end),
            fetchRawMaterialsCostSummary(dateRanges.month4.start, dateRanges.month4.end)
        ]);
        // Fetch average USD currency rate
        let avgUsdCurrencyData = {}; // Initialize to an empty object
        try {
            avgUsdCurrencyData = await fetchAvgUsdCurrency();
            console.log('avgUsdCurrencyData (after fetch):', avgUsdCurrencyData); // Debugging line
        } catch (currencyError) {
            console.error('Error fetching AVG USD Currency data:', currencyError);
            showError('Failed to fetch AVG USD Currency data: ' + currencyError.message);
        }

        // Pass avgUsdCurrencyData to processAndDisplayRawMaterialsTable
        processAndDisplayRawMaterialsTable(rawMaterialsTableHead, rawMaterialsTableBody, allMonthlyRawMaterialsData, 'rawMaterials', avgUsdCurrencyData);

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
    
    // Current month
    let tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    ranges.current = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 1
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month1 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 2
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month2 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 3
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month3 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 4
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month4 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 5
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month5 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 6
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month6 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 7
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month7 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 8
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month8 = getMonthDateRange(new Date(tempDate)); // Pass a copy

    // Month - 9
    tempDate.setMonth(tempDate.getMonth() - 1);
    ranges.month9 = getMonthDateRange(new Date(tempDate)); // Pass a copy
    
    return ranges;
}

// Get start and end dates for a given month
function getMonthDateRange(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    // Adjust dates by adding one day to correct for potential timezone/conversion issues
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
    };
}

// Fetch net income summary data from the backend API
async function fetchNetIncomeSummary(startDate, endDate) {
    const response = await fetch(`/api/income-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Fetch expense data for 720- accounts from the backend API
async function fetchExpense720Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-720-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Fetch expense data for 730- accounts from the backend API
async function fetchExpense730Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-730-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Fetch expense data for 760- accounts from the backend API
async function fetchExpense760Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-760-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Fetch expense data for 770- accounts from the backend API
async function fetchExpense770Summary(startDate, endDate) {
    const response = await fetch(`/api/expense-770-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}


// Fetch raw materials cost data from the backend API
async function fetchRawMaterialsCostSummary(startDate, endDate) {
    const response = await fetch(`/api/raw-materials-cost-summary?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Fetch average USD currency rate from the backend API
async function fetchAvgUsdCurrency() {
    // The server-side query uses GETDATE() for the date range, so no need to pass startDate/endDate here
    const response = await fetch(`/api/avg-usd-currency`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}
 
// Process and display the table with months as rows and branches as columns
function processAndDisplayTable(tableHeadElement, tableBodyElement, allMonthlyData, type) {
    // Clear existing table content
    tableHeadElement.innerHTML = '';
    tableBodyElement.innerHTML = '';

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const branchOrder = [1, 3, 4]; // IZMIR, URFA, FLEX
    const displayBranchNames = branchOrder.map(id => branchNames[id]);

    // Create table header
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>Month</th>${displayBranchNames.map(name => `<th>${name}</th>`).join('')}<th>TOTAL</th>`;
    tableHeadElement.appendChild(headerRow);

    // Prepare data for rows (months)
    const rowsData = [];
    let overallBranchTotals = { 1: 0, 3: 0, 4: 0 };
    let overallTotal = 0;

    for (let i = 0; i < allMonthlyData.length; i++) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
        const monthlyData = allMonthlyData[i]; // Data for this specific month

        let monthTotal = 0;
        const branchValues = {};

        branchOrder.forEach(branchId => {
            const amount = monthlyData[branchId] || 0;
            const absAmount = Math.abs(amount);
            let isSpecialCase = false;

            if (type === 'expense780' && monthDate.getFullYear() === 2025 && monthDate.getMonth() === 5) {
                isSpecialCase = true;
                monthTotal -= absAmount;
                overallBranchTotals[branchId] -= absAmount;
            } else {
                monthTotal += absAmount;
                overallBranchTotals[branchId] += absAmount;
            }
            branchValues[branchId] = { value: absAmount, special: isSpecialCase };
        });
        overallTotal += monthTotal;

        rowsData.push({
            label: monthLabel,
            values: branchValues,
            total: monthTotal,
            isSpecialMonth: monthDate.getFullYear() === 2025 && monthDate.getMonth() === 5
        });
    }
 
    // Render data rows
    rowsData.forEach(rowData => {
        const row = document.createElement('tr');
        let rowHtml = `<td>${rowData.label}</td>`;
        branchOrder.forEach(branchId => {
            const cellValue = rowData.values[branchId];
            let displayValue = formatCurrency(cellValue.value, type);
            if (cellValue.special) {
                displayValue = `(*) ${displayValue}`;
            }
            rowHtml += `<td>${displayValue}</td>`;
        });
        rowHtml += `<td>${formatCurrency(rowData.total, type)}</td>`;
        row.innerHTML = rowHtml;
        tableBodyElement.appendChild(row);
    });

    // Calculate L3MA (Last 3 Months Average)
    const l3maBranchTotals = { 1: 0, 3: 0, 4: 0 };
    let l3maOverallTotal = 0;
    // We need to average the previous 3 months, which are at indices 1, 2, and 3 in rowsData
    // Ensure rowsData has at least 4 entries (current + 3 previous)
    let numMonthsToAverage = 3;
    let footerLabel = 'L3MA';


    if (rowsData.length >= numMonthsToAverage + 2) { // We need at least 5 months of data now
        for (let i = 2; i < numMonthsToAverage + 2; i++) { // Loop from index 2 to 4
            const monthData = rowsData[i];
            branchOrder.forEach(branchId => {
                l3maBranchTotals[branchId] += monthData.values[branchId].value;
            });

            // The monthly total is already calculated with the special case in mind.
            l3maOverallTotal += monthData.total;
        }

        // Divide by the number of months to get the average
        branchOrder.forEach(branchId => {
            l3maBranchTotals[branchId] /= numMonthsToAverage;
        });
        l3maOverallTotal /= numMonthsToAverage;
    } else {
        // If there aren't enough previous months, L3MA/L9MA will remain 0 or can be handled differently
        // For now, it will remain 0 as initialized.
    }

    // Add L3MA/L9MA row
    const l3maRow = document.createElement('tr');
    l3maRow.classList.add('l3ma-total');
    let l3maHtml = `<td>${footerLabel}</td>`;
    branchOrder.forEach(branchId => {
        l3maHtml += `<td>${formatCurrency(l3maBranchTotals[branchId], type)}</td>`;
    });
    l3maHtml += `<td>${formatCurrency(l3maOverallTotal, type)}</td>`;
    l3maRow.innerHTML = l3maHtml;
    tableBodyElement.appendChild(l3maRow);



}

// Process and display the Raw Materials table
function processAndDisplayRawMaterialsTable(tableHeadElement, tableBodyElement, allMonthlyData, type, avgUsdCurrencyData) { // Accept avgUsdCurrencyData
    console.log('processAndDisplayRawMaterialsTable - avgUsdCurrencyData:', avgUsdCurrencyData); // Debugging line
    tableHeadElement.innerHTML = '';
    tableBodyElement.innerHTML = '';
 
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const branchOrder = [1, 3]; // IZMIR, URFA for raw materials
    const displayBranchNames = { 1: 'IZMIR', 3: 'URFA' };

    // Create table header
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Month</th>
        <th>KG IZMIR</th>
        <th>SAP COST IZMIR</th>
        <th>KG URFA</th>
        <th>SAP COST URFA</th>
        <th>Manual RM $</th>
        <th>AVG USD Currency</th> <!-- New column -->
        <th>TOTAL</th>
    `;
    tableHeadElement.appendChild(headerRow);
 
    const rowsData = [];
    let overallKgIzmirTotal = 0;
    let overallSapCostIzmirTotal = 0;
    let overallKgUrfaTotal = 0;
    let overallSapCostUrfaTotal = 0;
    let overallManualRmTotal = 0; // This will be the sum of calculated manual costs
    let overallAvgUsdCurrencyTotal = 0; // New total for AVG USD Currency
    let overallTotalCost = 0;

    for (let i = 0; i < allMonthlyData.length; i++) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthLabel = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
        const monthlyData = allMonthlyData[i]; // Data for this specific month
 
        const kgIzmir = monthlyData[1] ? parseFloat(monthlyData[1].Consumed) : 0;
        const sapCostIzmir = monthlyData[1] ? parseFloat(monthlyData[1].CostOfConsumed) : 0;
        const kgUrfa = monthlyData[3] ? parseFloat(monthlyData[3].Consumed) : 0;
        const sapCostUrfa = monthlyData[3] ? parseFloat(monthlyData[3].CostOfConsumed) : 0;
        let manualRmUsd = 0; // Default manual RM $

        // Calculate totals for L3MA
        overallKgIzmirTotal += kgIzmir;
        overallSapCostIzmirTotal += sapCostIzmir;
        overallKgUrfaTotal += kgUrfa;
        overallSapCostUrfaTotal += sapCostUrfa;

        // Get AVG USD Currency for the current month
        const year = monthDate.getFullYear();
        const month = (monthDate.getMonth() + 1).toString().padStart(2, '0'); // Format to MM
        const yearMonthKey = `${year}-${month}`; // Format to YYYY-MM
        const avgUsdRate = avgUsdCurrencyData[yearMonthKey] || 0; // Use YYYY-MM key
        overallAvgUsdCurrencyTotal += avgUsdRate;
 
        rowsData.push({
            label: monthLabel,
            kgIzmir: kgIzmir,
            sapCostIzmir: sapCostIzmir,
            kgUrfa: kgUrfa,
            sapCostUrfa: sapCostUrfa,
            manualRmUsd: manualRmUsd,
            avgUsdRate: avgUsdRate, // Store the rate
            totalCost: sapCostIzmir + sapCostUrfa // Initial total
        });
    }

    // Render data rows
    rowsData.forEach((rowData, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rowData.label}</td>
            <td>${formatNumber(rowData.kgIzmir)}</td>
            <td id="sap-cost-izmir-${index}">${formatCurrency(rowData.sapCostIzmir, type)}</td>
            <td>${formatNumber(rowData.kgUrfa)}</td>
            <td id="sap-cost-urfa-${index}">${formatCurrency(rowData.sapCostUrfa, type)}</td>
            <td><input type="number" class="manual-rm-input" data-row-index="${index}" value="${rowData.manualRmUsd.toFixed(2)}" step="0.01"></td>
            <td id="avg-usd-currency-${index}">${formatNumber(rowData.avgUsdRate)}</td> <!-- New column display -->
            <td id="total-cost-${index}">${formatCurrency(rowData.totalCost, type)}</td>
        `;
        tableBodyElement.appendChild(row);
    });

    // Add event listeners for manual RM input
    tableBodyElement.querySelectorAll('.manual-rm-input').forEach(input => {
        input.addEventListener('change', (event) => {
            const rowIndex = parseInt(event.target.dataset.rowIndex);
            const newManualRmUsd = parseFloat(event.target.value) || 0;
            rowsData[rowIndex].manualRmUsd = newManualRmUsd;
            recalculateRawMaterialsRow(rowIndex, tableBodyElement, type); // Pass tableBodyElement
        });
    });

    // Recalculate a specific row based on manual RM input
    function recalculateRawMaterialsRow(rowIndex, tableBodyElement, type) { // Accept tableBodyElement
        const rowData = rowsData[rowIndex];
        const kgIzmir = rowData.kgIzmir;
        const kgUrfa = rowData.kgUrfa;
        const manualRmUsd = rowData.manualRmUsd;

        const newSapCostIzmir = kgIzmir * manualRmUsd * rowData.avgUsdRate; // Multiply by AVG USD Rate
        const newSapCostUrfa = kgUrfa * manualRmUsd * rowData.avgUsdRate;   // Multiply by AVG USD Rate
        const newTotalCost = newSapCostIzmir + newSapCostUrfa;

        // Update rowData
        rowData.sapCostIzmir = newSapCostIzmir;
        rowData.sapCostUrfa = newSapCostUrfa;
        rowData.totalCost = newTotalCost;

        // Update displayed values
        document.getElementById(`sap-cost-izmir-${rowIndex}`).textContent = formatCurrency(newSapCostIzmir, type);
        document.getElementById(`sap-cost-urfa-${rowIndex}`).textContent = formatCurrency(newSapCostUrfa, type);
        document.getElementById(`total-cost-${rowIndex}`).textContent = formatCurrency(newTotalCost, type);
 
        // Recalculate L3MA after row change
        updateRawMaterialsL3MA(tableBodyElement, type); // Pass tableBodyElement
    }
 
    // Calculate and update L3MA for raw materials table
    function updateRawMaterialsL3MA(tableBodyElement, type) { // Accept tableBodyElement
        let l3maKgIzmir = 0;
        let l3maSapCostIzmir = 0;
        let l3maKgUrfa = 0;
        let l3maSapCostUrfa = 0;
        let l3maAvgUsdRate = 0; // New L3MA for AVG USD Currency
        let l3maTotalCost = 0;
 
        const numMonthsToAverage = 3;
        if (rowsData.length >= numMonthsToAverage + 2) {
            for (let i = 2; i < numMonthsToAverage + 2; i++) {
                const monthData = rowsData[i];
                l3maKgIzmir += monthData.kgIzmir;
                l3maSapCostIzmir += monthData.sapCostIzmir;
                l3maKgUrfa += monthData.kgUrfa;
                l3maSapCostUrfa += monthData.sapCostUrfa;
                l3maAvgUsdRate += monthData.avgUsdRate; // Add to L3MA for AVG USD Currency
                l3maTotalCost += monthData.totalCost;
            }

            l3maKgIzmir /= numMonthsToAverage;
            l3maSapCostIzmir /= numMonthsToAverage;
            l3maKgUrfa /= numMonthsToAverage;
            l3maSapCostUrfa /= numMonthsToAverage;
            l3maAvgUsdRate /= numMonthsToAverage; // Divide for L3MA for AVG USD Currency
            l3maTotalCost /= numMonthsToAverage;
        }
 
        // Remove existing L3MA row if any
        const existingL3maRow = tableBodyElement.querySelector('.l3ma-total'); // Use tableBodyElement
        if (existingL3maRow) {
            existingL3maRow.remove();
        }

        // Add new L3MA row
        const l3maRow = document.createElement('tr');
        l3maRow.classList.add('l3ma-total');
        l3maRow.innerHTML = `
            <td>L3MA</td>
            <td>${formatNumber(l3maKgIzmir)}</td>
            <td>${formatCurrency(l3maSapCostIzmir, type)}</td>
            <td>${formatNumber(l3maKgUrfa)}</td>
            <td>${formatCurrency(l3maSapCostUrfa, type)}</td>
            <td></td> <!-- Manual RM $ column for L3MA -->
            <td>${formatNumber(l3maAvgUsdRate)}</td> <!-- AVG USD column for L3MA -->
            <td>${formatCurrency(l3maTotalCost, type)}</td>
        `;
        tableBodyElement.appendChild(l3maRow); // Use tableBodyElement
    }
 
    // Initial L3MA calculation
    updateRawMaterialsL3MA(tableBodyElement, type); // Pass tableBodyElement
}

// Format numbers for KG columns (no currency symbol)
function formatNumber(amount) {
    if (isNaN(amount)) return '0';
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
 
// Format currency for display (Turkish Lira)
function formatCurrency(amount, type) {
    if (isNaN(amount)) return '0,00 ₺';
    const formattedAmount = new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));

    // Remove the negative sign for expenses, as per user request.
    // The absolute value is already taken for formatting, so just return the formatted amount.
    return formattedAmount;
}

// Show loading indicator
function showLoading() {
    loadingIndicator.style.display = 'block';
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// Show error message
function showError(message) {
    errorText.textContent = message;
    errorContainer.style.display = 'block';
}

// Hide error message
function hideError() {
    errorContainer.style.display = 'none';
}