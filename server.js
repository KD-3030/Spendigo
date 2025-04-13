// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
let db;

async function connectToDB() {
  try {
    await client.connect();
    db = client.db('spendigo_db');
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}
connectToDB();

// Helper function to validate ObjectId
function isValidObjectId(id) {
  return ObjectId.isValid(id) && (new ObjectId(id)).toString() === id;
}

// Admin Login Endpoint
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await db.collection('admins').findOne({ email });
        if (!admin) {
            return res.status(401).send({ message: "Admin not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, admin.password);
        if (!isPasswordCorrect) {
            return res.status(401).send({ message: "Invalid credentials" });
        }

        res.send({ message: "Login successful" });
    } catch (err) {
        console.error("Error logging in admin", err);
        res.status(500).send({ message: "Database error" });
    }
});

// Get All Users Endpoint
app.get('/admin/users', async (req, res) => {
    try {
        const users = await db.collection('users').aggregate([
            {
                $lookup: {
                    from: 'budgets',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'budget'
                }
            },
            {
                $unwind: {
                    path: "$budget",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    user_id: "$_id",
                    email: 1,
                    phone: 1,
                    monthly_budget: "$budget.monthly_budget",
                    target_daily: "$budget.remaining_budget"
                }
            }
        ]).toArray();

        res.json(users);
    } catch (err) {
        console.error("Error fetching users", err);
        res.status(500).send({ message: "Database error" });
    }
});

// API to register user
app.post('/register', async (req, res) => {
    const { email, phone, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({ email, phone, password: hashedPassword });
        res.send({ message: 'User registered successfully', userId: result.insertedId });
    } catch (err) {
        console.error("Error registering user", err);
        res.status(500).send({ message: "Database error" });
    }
});

app.post('/sign-in', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            console.log("User not found for email:", email); // Debug log
            return res.status(401).send({ message: "User not found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            console.log("Password mismatch for email:", email); // Debug log
            return res.status(401).send({ message: "Invalid credentials" });
        }

        console.log("User signed in successfully:", email); // Debug log
        res.send({ message: "Sign-in successful", userId: user._id });
    } catch (err) {
        console.error("Error signing in user", err);
        res.status(500).send({ message: "Database error" });
    }
});

// Check Budget Endpoint
app.get('/check-budget/:userId', async (req, res) => {
    const userId = req.params.userId;

    if (!isValidObjectId(userId)) {
        return res.status(400).send({ message: "Invalid userId format" });
    }

    try {
        // Convert userId to ObjectId
        const objectId = new ObjectId(userId);

        // Check if a budget exists for the user
        const budget = await db.collection('budgets').findOne({ userId: objectId });

        // Respond with whether the budget exists and the budget details if available
        if (budget) {
            res.json({
                hasBudget: true,
                monthlyBudget: budget.monthly_budget,
                targetDaily: budget.target_daily
            });
        } else {
            res.json({ hasBudget: false });
        }
    } catch (err) {
        console.error("Error checking budget data", err);
        res.status(500).send({ message: "Database error" });
    }
});



// API to input budget
app.post('/set-budget', async (req, res) => {
    const { userId, monthlyBudget, targetDaily } = req.body;

    if (!isValidObjectId(userId)) {
        return res.status(400).send({ message: "Invalid userId format" });
    }

    try {
        await db.collection('budgets').updateOne(
            { userId: new ObjectId(userId) },
            { $set: { monthly_budget: monthlyBudget, target_daily: targetDaily } },
            { upsert: true }
        );
        res.send({ message: 'Budget set successfully' });
    } catch (err) {
        console.error("Error setting budget", err);
        res.status(500).send({ message: "Database error" });
    }
});

// API to add daily expenses
app.post('/add-expense', async (req, res) => {
    const { userId, dailyExpense } = req.body;

    if (!isValidObjectId(userId)) {
        return res.status(400).send({ message: "Invalid userId format" });
    }

    try {
        await db.collection('expenses').insertOne({ userId: new ObjectId(userId), expense: dailyExpense });
        res.send({ message: 'Expense added successfully' });
    } catch (err) {
        console.error("Error adding expense", err);
        res.status(500).send({ message: "Database error" });
    }
});

// Get Savings Endpoint
app.get('/get-savings/:userId', async (req, res) => {
    const userId = req.params.userId;

    if (!isValidObjectId(userId)) {
        return res.status(400).send({ message: "Invalid userId format" });
    }

    try {
        // Convert the userId to ObjectId type
        const objectId = new ObjectId(userId);

        // Fetch the budget for the user
        const budget = await db.collection('budgets').findOne({ userId: objectId });
        if (!budget) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        // Aggregate total expenses for the user
        const totalExpenses = await db.collection('expenses').aggregate([
            { $match: { userId: objectId } },
            { $group: { _id: null, total_expenses: { $sum: "$expense" } } }
        ]).toArray();

        // Calculate the total expenses value
        const totalExpensesValue = totalExpenses.length > 0 ? totalExpenses[0].total_expenses : 0;

        // Calculate the remaining budget
        const remainingBudget = budget.monthly_budget - totalExpensesValue;

        // Save the remaining budget in the database
        await db.collection('budgets').updateOne(
            { userId: objectId },
            { $set: { remaining_budget: remainingBudget } }
        );

        // Debug Logs
        console.log("Budget fetched:", budget);
        console.log("Total Expenses fetched:", totalExpenses);
        console.log("Total Expenses Value:", totalExpensesValue);
        console.log("Remaining Budget Calculated and Saved:", remainingBudget);

        res.json({ monthlyBudget: budget.monthly_budget, remainingBudget });
    } catch (err) {
        console.error("Error fetching and saving remaining budget", err);
        res.status(500).send({ message: "Database error" });
    }
});




// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
