const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static('uploads')); // Serve uploaded images

// Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '32662272',
    database: 'nodemysql'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database');
});

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Create Children Table with Image Columns
app.get('/createchildtable', (req, res) => {
    let sql = `
        CREATE TABLE IF NOT EXISTS children (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            grade VARCHAR(50),
            history TEXT,
            parent_name VARCHAR(255),
            sibling_names TEXT,
            profile_picture VARCHAR(255),  -- Stores path to the child's profile picture
            history_picture VARCHAR(255)   -- Stores path to the child's history picture
        )
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).send(err);
        res.send('Children table created successfully');
    });
});

// Add a Child with Profile Picture & History Picture
app.post('/children', upload.fields([{ name: 'profile_picture' }, { name: 'history_picture' }]), (req, res) => {
    const { name, grade, history, parent_name, sibling_names } = req.body;
    const profilePicturePath = req.files['profile_picture'] ? req.files['profile_picture'][0].path : null;
    const historyPicturePath = req.files['history_picture'] ? req.files['history_picture'][0].path : null;

    let sql = 'INSERT INTO children (name, grade, history, parent_name, sibling_names, profile_picture, history_picture) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, grade, history, parent_name, sibling_names, profilePicturePath, historyPicturePath], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Child added', id: result.insertId });
    });
});

// Update Child's Information and Pictures
app.put('/children/:id', upload.fields([{ name: 'profile_picture' }, { name: 'history_picture' }]), (req, res) => {
    const { name, grade, history, parent_name, sibling_names } = req.body;
    const profilePicturePath = req.files['profile_picture'] ? req.files['profile_picture'][0].path : null;
    const historyPicturePath = req.files['history_picture'] ? req.files['history_picture'][0].path : null;

    let sql = `UPDATE children SET name=?, grade=?, history=?, parent_name=?, sibling_names=? 
               ${profilePicturePath ? ", profile_picture=?" : ""} 
               ${historyPicturePath ? ", history_picture=?" : ""}
               WHERE id=?`;

    const values = [name, grade, history, parent_name, sibling_names];
    if (profilePicturePath) values.push(profilePicturePath);
    if (historyPicturePath) values.push(historyPicturePath);
    values.push(req.params.id);

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Child updated' });
    });
});

// Get All Children (with Image URLs)
app.get('/children', (req, res) => {
    let sql = 'SELECT *, CONCAT("http://localhost:3000/", profile_picture) AS profile_picture_url, CONCAT("http://localhost:5000/", history_picture) AS history_picture_url FROM children';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Delete a Child
app.delete('/children/:id', (req, res) => {
    let sql = 'DELETE FROM children WHERE id=?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Child deleted' });
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});
