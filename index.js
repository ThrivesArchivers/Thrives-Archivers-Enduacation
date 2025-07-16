const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const USERS_FILE = 'users.json';

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE));
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Status check
app.get('/api/status', (req, res) => {
    res.json({ status: 'Control Panel API is running!' });
});

// Signup route
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    if (users.find(u => u.username === username)) {
        return res.json({ success: false, message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    writeUsers(users);
    res.json({ success: true });
});

// Login route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.json({ success: false, message: 'Invalid login' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.json({ success: false, message: 'Wrong password' });

    res.json({ success: true, token: username });
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});