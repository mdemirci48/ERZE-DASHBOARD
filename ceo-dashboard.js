document.addEventListener('DOMContentLoaded', () => {
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
        const nineMonthAvg = (grandTotal && grandTotal.Last6M_Avg) ? grandTotal.Last6M_Avg : 0;

        // Fetch turnover for the current month
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        const turnoverResponse = await fetch(`/api/income-summary?startDate=${startDate}&endDate=${endDate}`);
        if (!turnoverResponse.ok) {
            throw new Error(`HTTP error! status: ${turnoverResponse.status}`);
        }
        const turnoverData = await turnoverResponse.json();
        const liveTurnover = turnoverData[branchId] || 0;

        // Fetch raw materials data
        const rawMaterialsResponse = await fetch(rawMaterialsUrl);
        if (!rawMaterialsResponse.ok) {
            throw new Error(`HTTP error! status: ${rawMaterialsResponse.status}`);
        }
        const rawMaterialsData = await rawMaterialsResponse.json();

        // Populate the table
        populateRawMaterialsTable(branchName, rawMaterialsData, nineMonthAvg, liveTurnover);

    } catch (error) {
        errorText.textContent = `Failed to fetch data for ${branchName}: ${error.message}`;
        errorContainer.style.display = 'block';
        console.error(`Error fetching data for ${branchName}:`, error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function populateRawMaterialsTable(branchName, data, nineMonthAvg, liveTurnover) {
    const table = document.getElementById(`raw-materials-table-${branchName.toLowerCase()}`);
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const tableTitle = document.getElementById(`table-title-raw-materials-${branchName.toLowerCase()}`);

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const currentMonth = new Date().getMonth();
    tableTitle.textContent = `Raw Materials Live Cost - ${branchName} for ${monthNames[currentMonth]}`;

    thead.innerHTML = `
        <tr>
            <th>Purchase Type</th>
            <th>Current Month Total</th>
            <th>Last 3M Avg.</th>
            <th>Last 6M Avg.</th>
        </tr>
    `;

    tbody.innerHTML = '';

    let currentMonthTotal = 0;

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.PurchaseType}</td>
            <td>${formatCurrency(item.Total)}</td>
            <td>${formatCurrency(item.Last3M_Avg)}</td>
            <td>${formatCurrency(item.Last6M_Avg)}</td>
        `;
        tbody.appendChild(row);
        currentMonthTotal += item.Total;
    });
    
    // Add 6-month average row if it's IZMIR
    let xpetTrayRow;

    if (branchName === 'IZMIR') {
        xpetTrayRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.cells[0].textContent.trim() === 'XPET TRAY PURCHASES');
    } else {
        xpetTrayRow = tbody.querySelector('tr');
    }


    if (xpetTrayRow) {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>6 Month Average</td>
            <td>${formatCurrency(nineMonthAvg)}</td>
            <td></td>
            <td></td>
        `;

        if (branchName === 'IZMIR') {
            xpetTrayRow.parentNode.insertBefore(newRow, xpetTrayRow.nextSibling);
        } else {
            tbody.appendChild(newRow);
        }
        
        currentMonthTotal += nineMonthAvg;
    }
    
    const totalsRow = document.createElement('tr');
    totalsRow.classList.add('grand-total-row');
    totalsRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${formatCurrency(currentMonthTotal)}</strong></td>
        <td></td>
        <td></td>
    `;
    tbody.appendChild(totalsRow);

    const turnoverRow = document.createElement('tr');
    turnoverRow.innerHTML = `
        <td><strong>Turnover</strong></td>
        <td><strong>${formatCurrency(liveTurnover)}</strong></td>
        <td></td>
        <td></td>
    `;
    tbody.insertBefore(turnoverRow, totalsRow);

    const profitRow = document.createElement('tr');
    profitRow.classList.add('grand-total-row');
    profitRow.innerHTML = `
        <td><strong>Profit</strong></td>
        <td><strong>${formatCurrency(liveTurnover - currentMonthTotal)}</strong></td>
        <td></td>
        <td></td>
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