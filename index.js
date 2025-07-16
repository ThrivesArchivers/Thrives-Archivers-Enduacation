const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static frontend (optional if deploying both together)
app.use(express.static(path.join(__dirname, 'public'))); // Only if HTML is in /public folder

const USERS_FILE = 'users.json';

// Read users from file
function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

// Write users to file
function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ✅ Status check endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'Control Panel API is running!' });
});

// ✅ Signup endpoint
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const users = readUsers();

    if (users.find(u => u.username === username)) {
        return res.status(409).json({ success: false, message: 'Username already taken.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hashedPassword });
    writeUsers(users);

    res.status(201).json({ success: true, message: 'User registered successfully.' });
});

// ✅ Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid username.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Wrong password.' });
    }

    res.json({ success: true, token: username });
});

// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});
