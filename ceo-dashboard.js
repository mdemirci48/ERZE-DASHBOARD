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

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) return;
    
    fetchAllBranchData();
});

async function fetchAllBranchData() {
    await Promise.all([
        fetchBranchData('IZMIR', 1, '/api/live-raw-materials', '/api/live-expenses'),
        fetchBranchData('URFA', 3, '/api/live-raw-materials-urfa', '/api/live-expenses-urfa'),
        fetchBranchData('FLEX', 4, '/api/live-raw-materials-flex', '/api/live-expenses-flex')
    ]);
}

async function fetchBranchData(branchName, branchId, rawMaterialsUrl, expensesUrl) {
    const loadingIndicator = document.getElementById(`loading-${branchName.toLowerCase()}`);
    const errorContainer = document.getElementById(`error-${branchName.toLowerCase()}`);
    const errorText = document.getElementById(`error-text-${branchName.toLowerCase()}`);

    loadingIndicator.style.display = 'block';
    errorContainer.style.display = 'none';

    try {
        // Fetch live expenses to get the 6-month average
        const expensesResponse = await fetch(expensesUrl);
        if (!expensesResponse.ok) {
            throw new Error(`HTTP error! status: ${expensesResponse.status}`);
        }
        const expensesData = await expensesResponse.json();
        const grandTotal = expensesData.find(item => item.LineType === 'Grand Total');
        const expensesCurrent = (grandTotal && grandTotal.Total) ? grandTotal.Total : 0;
        const expensesLast3M = (grandTotal && grandTotal.Last3M_Avg) ? grandTotal.Last3M_Avg : 0;
        const expensesLast6M = (grandTotal && grandTotal.Last6M_Avg) ? grandTotal.Last6M_Avg : 0;

        // Fetch turnover for current month and historical months
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        // Current month
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        const turnoverResponse = await fetch(`/api/income-summary?startDate=${startDate}&endDate=${endDate}`);
        if (!turnoverResponse.ok) {
            throw new Error(`HTTP error! status: ${turnoverResponse.status}`);
        }
        const turnoverData = await turnoverResponse.json();
        const liveTurnover = turnoverData[branchId] || 0;

        // Fetch historical turnover for last 3 and 6 months (excluding previous month)
        // We need months -2 to -7 (6 months starting from 2 months ago)
        const historicalTurnovers = await fetchHistoricalTurnover(branchId, 7); // Fetch 7 months back
        // Last 3M Avg: months -2, -3, -4 (indices 1, 2, 3 - skipping index 0 which is month -1)
        const turnoverLast3M = calculateAverage(historicalTurnovers.slice(1, 4));
        // Last 6M Avg: months -2 to -7 (indices 1 to 6 - skipping index 0 which is month -1)
        const turnoverLast6M = calculateAverage(historicalTurnovers.slice(1, 7));

        // Fetch raw materials data
        const rawMaterialsResponse = await fetch(rawMaterialsUrl);
        if (!rawMaterialsResponse.ok) {
            throw new Error(`HTTP error! status: ${rawMaterialsResponse.status}`);
        }
        const rawMaterialsData = await rawMaterialsResponse.json();

        // Populate the table with all data
        populateRawMaterialsTable(branchName, rawMaterialsData, {
            expensesCurrent,
            expensesLast3M,
            expensesLast6M,
            liveTurnover,
            turnoverLast3M,
            turnoverLast6M
        });

    } catch (error) {
        errorText.textContent = `Failed to fetch data for ${branchName}: ${error.message}`;
        errorContainer.style.display = 'block';
        console.error(`Error fetching data for ${branchName}:`, error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Helper function to fetch historical turnover data
async function fetchHistoricalTurnover(branchId, months) {
    const turnovers = [];
    const date = new Date();
    
    for (let i = 1; i <= months; i++) {
        const targetDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();
        
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        
        try {
            const response = await fetch(`/api/income-summary?startDate=${startDate}&endDate=${endDate}`);
            if (response.ok) {
                const data = await response.json();
                turnovers.push(data[branchId] || 0);
            } else {
                turnovers.push(0);
            }
        } catch (error) {
            console.error(`Error fetching turnover for ${startDate}:`, error);
            turnovers.push(0);
        }
    }
    
    return turnovers;
}

// Helper function to calculate average
function calculateAverage(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

function populateRawMaterialsTable(branchName, data, averages) {
    const table = document.getElementById(`raw-materials-table-${branchName.toLowerCase()}`);
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const tableTitle = document.getElementById(`table-title-raw-materials-${branchName.toLowerCase()}`);

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const currentMonth = new Date().getMonth();
    tableTitle.textContent = `ERZE - ${branchName} for ${monthNames[currentMonth]}`;

    thead.innerHTML = `
        <tr>
            <th>Item</th>
            <th>Current Month Total</th>
            <th>Last 3M Avg.</th>
            <th>Last 6M Avg.</th>
        </tr>
    `;

    tbody.innerHTML = '';

    let currentMonthTotal = 0;
    let last3MTotal = 0;
    let last6MTotal = 0;

    data.forEach(item => {
        const row = document.createElement('tr');
        // Add consumed weight to label for Raw Mat items (IZMIR and URFA)
        let displayLabel = item.PurchaseType;
        if ((item.PurchaseType === 'Raw Mat. (+40%)' || item.PurchaseType === 'Raw Mat. (+20%)') && item.ConsumedQty) {
            displayLabel = `${item.PurchaseType} (${formatNumber(item.ConsumedQty)} kg)`;
        }
        
        row.innerHTML = `
            <td>${displayLabel}</td>
            <td>${formatCurrency(item.Total)}</td>
            <td>${formatCurrency(item.Last3M_Avg)}</td>
            <td>${formatCurrency(item.Last6M_Avg)}</td>
        `;
        tbody.appendChild(row);
        currentMonthTotal += item.Total;
        last3MTotal += item.Last3M_Avg;
        last6MTotal += item.Last6M_Avg;
    });
    
    // Add expenses 6-month average row
    let xpetTrayRow;

    if (branchName === 'IZMIR') {
        xpetTrayRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.cells[0].textContent.trim() === 'XPET TRAY PURCHASES');
    } else {
        xpetTrayRow = tbody.querySelector('tr');
    }

    if (xpetTrayRow) {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>Expenses (6M Avg. Estimate)</td>
            <td>${formatCurrency(averages.expensesLast6M)}</td>
            <td>${formatCurrency(averages.expensesLast3M)}</td>
            <td>${formatCurrency(averages.expensesLast6M)}</td>
        `;

        if (branchName === 'IZMIR') {
            xpetTrayRow.parentNode.insertBefore(newRow, xpetTrayRow.nextSibling);
        } else {
            tbody.appendChild(newRow);
        }
        
        currentMonthTotal += averages.expensesLast6M;
        last3MTotal += averages.expensesLast3M;
        last6MTotal += averages.expensesLast6M;
    }
    
    // Add Turnover row (before Total)
    const turnoverRow = document.createElement('tr');
    turnoverRow.innerHTML = `
        <td><strong>Turnover</strong></td>
        <td><strong>${formatCurrency(averages.liveTurnover)}</strong></td>
        <td><strong>${formatCurrency(averages.turnoverLast3M)}</strong></td>
        <td><strong>${formatCurrency(averages.turnoverLast6M)}</strong></td>
    `;
    tbody.appendChild(turnoverRow);
    
    // Add Total row
    const totalsRow = document.createElement('tr');
    totalsRow.classList.add('grand-total-row');
    totalsRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${formatCurrency(currentMonthTotal)}</strong></td>
        <td><strong>${formatCurrency(last3MTotal)}</strong></td>
        <td><strong>${formatCurrency(last6MTotal)}</strong></td>
    `;
    tbody.appendChild(totalsRow);

    // Add Profit row
    const profitRow = document.createElement('tr');
    profitRow.classList.add('grand-total-row');
    profitRow.innerHTML = `
        <td><strong>Profit</strong></td>
        <td><strong>${formatCurrency(averages.liveTurnover - currentMonthTotal)}</strong></td>
        <td><strong>${formatCurrency(averages.turnoverLast3M - last3MTotal)}</strong></td>
        <td><strong>${formatCurrency(averages.turnoverLast6M - last6MTotal)}</strong></td>
    `;
    tbody.appendChild(profitRow);
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

function formatNumber(amount) {
    if (isNaN(amount)) return '0';
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}