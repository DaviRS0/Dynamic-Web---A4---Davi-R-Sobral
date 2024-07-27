const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection URL and database name
const url = 'mongodb://localhost:27017';
const dbName = 'productSale';

// Serve the form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle form submission
app.post('/submit-form', async (req, res) => {
    const { name, address, city, province, phoneNumber, email, apples, bananas } = req.body;
    const errors = validateInputs(name, address, city, province, phoneNumber, email, apples, bananas);

    if (errors.length > 0) {
        res.send(generateErrorHtml(errors));
        return;
    }

    const totalPurchase = calculateTotalPurchase(apples, bananas);
    if (totalPurchase < 10) {
        res.send("Minimum purchase should be $10.");
        return;
    }

    // Connect to MongoDB and insert the form data
    try {
        const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('sales');

        const saleData = {
            name,
            address,
            city,
            province,
            phoneNumber,
            email,
            apples: parseInt(apples),
            bananas: parseInt(bananas),
            totalPurchase
        };

        await collection.insertOne(saleData);
        await client.close();
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        res.status(500).send('Internal server error');
        return;
    }

    const receiptHtml = generateReceipt(req.body, totalPurchase);
    res.send(receiptHtml);
});

const salesTaxRates = {
    "Alberta": 0.05,
    "British Columbia": 0.12,
    "Manitoba": 0.13,
    "New Brunswick": 0.15,
    "Newfoundland and Labrador": 0.15,
    "Northwest Territories": 0.05,
    "Nova Scotia": 0.15,
    "Nunavut": 0.05,
    "Ontario": 0.13,
    "Prince Edward Island": 0.15,
    "Quebec": 0.14975,
    "Saskatchewan": 0.11,
    "Yukon": 0.05
};

function validateInputs(name, address, city, province, phoneNumber, email, apples, bananas) {
    let errors = [];
    // Validate mandatory fields
    if (!name) errors.push("Name is required.");
    if (!address) errors.push("Address is required.");
    if (!city) errors.push("City is required.");
    if (!province) errors.push("Province is required.");
    // Validate phone number format
    if (!/^\d{3}-\d{3}-\d{4}$/.test(phoneNumber)) errors.push("Phone Number must be in the format 555-555-5555.");
    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) errors.push("Invalid Email Address format.");
    // Validate product quantities
    // Check if both apples and bananas quantities are 0 or not provided
    if ((isNaN(apples) || apples <= 0) && (isNaN(bananas) || bananas <= 0)) {
        errors.push("At least one of Apples or Bananas quantity must be greater than 0.");
    } else {
        if (isNaN(apples) || apples < 0) errors.push("Apples quantity must be a positive number.");
        if (isNaN(bananas) || bananas < 0) errors.push("Bananas quantity must be a positive number.");
    }

    return errors;
}
// Calculate total purchase amount
function calculateTotalPurchase(apples, bananas) {
    const applePrice = 3; 
    const bananaPrice = 2; 
    return (apples * applePrice) + (bananas * bananaPrice);
}
// Generate receipt HTML page
function generateReceipt(formData, totalPurchase) {
    const applePrice = 3;
    const bananaPrice = 2;
    const taxRate = salesTaxRates[formData.province] || 0;
    const tax = totalPurchase * taxRate;
    const totalCost = totalPurchase + tax;
    const taxPercentage = taxRate * 100;
    const applesCost = formData.apples * applePrice;
    const bananasCost = formData.bananas * bananaPrice;

    return `<h1>Receipt</h1>
            <p>Name: ${formData.name}</p>
            <p>Email: ${formData.email}</p>
            <p>Phone Number: ${formData.phoneNumber}</p>
            <p>Address: ${formData.address}, ${formData.city}, ${formData.province}</p>
            ${formData.apples > 0 ? `<p>Apples Purchased @ $3: ${formData.apples} - $${applesCost.toFixed(2)}</p>` : ''}
            ${formData.bananas > 0 ? `<p>Bananas Purchased @ $2: ${formData.bananas} - $${bananasCost.toFixed(2)}</p>` : ''}
            <p>Total Purchase: $${totalPurchase.toFixed(2)}</p>
            <p>Sales Tax (${taxPercentage.toFixed(2)}%): $${tax.toFixed(2)}</p>
            <p>Total Cost: $${totalCost.toFixed(2)}</p>`;
}
// Generate error HTML page
function generateErrorHtml(errors) {
    return `<ul>${errors.map(error => `<li>${error}</li>`).join('')}</ul><a href="/">Go back</a>`;
}

// Listen on port 3000
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});