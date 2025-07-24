const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const CONTRACTS_FILE = path.join(__dirname, 'contracts.json');

function loadContracts() {
    if (fs.existsSync(CONTRACTS_FILE)) {
        const data = fs.readFileSync(CONTRACTS_FILE, 'utf8');
        return JSON.parse(data);
    }
    return [];
}

function saveContracts(contracts) {
    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contracts, null, 2));
}

app.get('/contracts', (req, res) => {
    const contracts = loadContracts();
    res.json(contracts);
});

app.post('/contracts', (req, res) => {
    const newContract = req.body;
    const contracts = loadContracts();
    contracts.push(newContract);
    saveContracts(contracts);
    res.status(201).json(newContract);
});

// Update contract approval status
app.put('/contracts/:address/approve', (req, res) => {
    const { address } = req.params;
    const contracts = loadContracts();
    
    const contractIndex = contracts.findIndex(contract => contract.address === address);
    if (contractIndex === -1) {
        return res.status(404).json({ error: 'Contract not found' });
    }
    contracts[contractIndex].isApproved = true;
    contracts[contractIndex].approvedAt = Math.floor(Date.now() / 1000); // Current time in seconds
    
    saveContracts(contracts);
    res.json(contracts[contractIndex]);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});