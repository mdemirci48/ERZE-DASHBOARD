const express = require('express');
const app = express();
const PORT = 3000;

app.get('/api/income-summary', (req, res) => {
    res.json({
        "600-01-": {1: 10000, 3: 15000, 4: 20000},
        "601-01-": {1: 5000, 3: 7500, 4: 10000},
        "602-01-": {1: 2500, 3: 3750, 4: 5000}
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`Simple test server running on http://localhost:${PORT}`);
});