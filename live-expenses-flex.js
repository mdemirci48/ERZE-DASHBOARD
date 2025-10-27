let nineMonthAvg = 0;
let liveTurnover = 0;

document.addEventListener('DOMContentLoaded', () => {
    fetchLiveExpenses().then(() => {
        fetchLiveRawMaterials().then(() => {
            fetchLiveTurnover();
        });
    });
});

async function fetchLiveTurnover() {
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error');
    const errorText = document.getElementById('error-text');

    loadingIndicator.style.display = 'block';
    errorContainer.style.display = 'none';

    try {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const lastDay = new Date(year, month, 0).getDate();

        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        
        const response = await fetch(`/api/income-summary?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        liveTurnover = data[4] || 0; // FLEX is branch 4

        populateTurnoverAndProfit();

    } catch (error) {
        errorText.textContent = 'Failed to fetch live turnover data: ' + error.message;
        errorContainer.style.display = 'block';
        console.error('Error fetching live turnover data:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

async function fetchLiveRawMaterials() {
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error');
    const errorText = document.getElementById('error-text');
    const tableTitle = document.getElementById('table-title-raw-materials');

    loadingIndicator.style.display = 'block';
    errorContainer.style.display = 'none';

    try {
        const response = await fetch('/api/live-raw-materials-flex');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];
        const currentMonth = new Date().getMonth();
        tableTitle.textContent = `Raw Materials Live Cost - FLEX for ${monthNames[currentMonth]}`;

        populateRawMaterialsTable(data);

    } catch (error) {
        errorText.textContent = 'Failed to fetch raw materials data: ' + error.message;
        errorContainer.style.display = 'block';
        console.error('Error fetching raw materials data:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}


async function fetchLiveExpenses() {
    const loadingIndicator = document.getElementById('loading');
    const errorContainer = document.getElementById('error');
    const errorText = document.getElementById('error-text');
    const tableTitle = document.getElementById('table-title-live');

    loadingIndicator.style.display = 'block';
    errorContainer.style.display = 'none';

    try {
        const response = await fetch('/api/live-expenses-flex');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        const monthNames = ["January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"];
        const currentMonth = new Date().getMonth();
        tableTitle.textContent = `Live Expenses for ${monthNames[currentMonth]}`;

        populateLiveExpenseTable(data);

        const grandTotal = data.find(item => item.LineType === 'Grand Total');
        if (grandTotal && grandTotal.Last6M_Avg) {
            nineMonthAvg = grandTotal.Last6M_Avg;
        }

    } catch (error) {
        errorText.textContent = 'Failed to fetch live expense data: ' + error.message;
        errorContainer.style.display = 'block';
        console.error('Error fetching live expense data:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function populateLiveExpenseTable(data) {
    const table = document.getElementById('live-expense-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = `
        <tr>
            <th>Account Group</th>
            <th>Account</th>
            <th>Account Name</th>
            <th>Current Month Total</th>
            <th>Last 3M Avg.</th>
            <th>Last 6M Avg.</th>
        </tr>
    `;

    tbody.innerHTML = ''; // Clear previous data

    data.forEach(item => {
        const row = document.createElement('tr');

        if (item.LineType === 'Subtotal') {
            row.classList.add('subtotal-row');
        } else if (item.LineType === 'Grand Total') {
            row.classList.add('grand-total-row');
        }

        row.innerHTML = `
            <td>${item.AccountGroup || '<strong>Grand Total</strong>'}</td>
            <td>${item.Account || `<strong>${item.AccountGroup} Total</strong>`}</td>
            <td>${item.AccountName || ''}</td>
            <td>${formatCurrency(item.Total)}</td>
            <td>${formatCurrency(item.Last3M_Avg)}</td>
            <td>${formatCurrency(item.Last6M_Avg)}</td>
        `;

        tbody.appendChild(row);
    });
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

function populateRawMaterialsTable(data) {
    const table = document.getElementById('raw-materials-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

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

    currentMonthTotal += nineMonthAvg;
    const totalsRow = document.createElement('tr');
    totalsRow.classList.add('grand-total-row');
    totalsRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${formatCurrency(currentMonthTotal)}</strong></td>
        <td></td>
        <td></td>
    `;
    tbody.appendChild(totalsRow);

    const averageRow = document.createElement('tr');
    averageRow.innerHTML = `
        <td>6 Month Average</td>
        <td>${formatCurrency(nineMonthAvg)}</td>
        <td></td>
        <td></td>
    `;
    tbody.insertBefore(averageRow, totalsRow);
}

function populateTurnoverAndProfit() {
    const table = document.getElementById('raw-materials-table');
    const tbody = table.querySelector('tbody');
    const totalsRow = tbody.querySelector('.grand-total-row');
    const totalCostText = totalsRow.cells[1].textContent;
    const totalCost = parseFloat(totalCostText.replace(/[^0-9,-]+/g, "").replace(",", "."));
    
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
        <td><strong>${formatCurrency(liveTurnover - totalCost)}</strong></td>
        <td></td>
        <td></td>
    `;
    tbody.appendChild(profitRow);
}