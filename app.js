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
app.use('/uploads', express.static('uploads'));

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

// Create Tables
app.get('/createtables', (req, res) => {
    let sqlChildren = `
        CREATE TABLE IF NOT EXISTS children (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            grade VARCHAR(50),
            history TEXT,
            parent_name VARCHAR(255),
            sibling_names TEXT,
            profile_picture VARCHAR(255),
            history_picture VARCHAR(255)
        )`;

    let sqlSponsors = `
        CREATE TABLE IF NOT EXISTS sponsors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            spouse_name VARCHAR(255),
            email VARCHAR(255),
            profile_picture VARCHAR(255)
        )`;

    let sqlSponsorships = `
        CREATE TABLE IF NOT EXISTS sponsorships (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sponsor_id INT,
            child_id INT,
            FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
            FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
        )`;

    db.query(sqlChildren, (err, result) => { if (err) return res.status(500).send(err); });
    db.query(sqlSponsors, (err, result) => { if (err) return res.status(500).send(err); });
    db.query(sqlSponsorships, (err, result) => { if (err) return res.status(500).send(err); });
    res.send('Tables created successfully');
});

// Add a Sponsor
app.post('/sponsors', upload.single('profile_picture'), (req, res) => {
    const { name, spouse_name, email } = req.body;
    const profilePicturePath = req.file ? req.file.path : null;

    let sql = 'INSERT INTO sponsors (name, spouse_name, email, profile_picture) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, spouse_name, email, profilePicturePath], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Sponsor added', id: result.insertId });
    });
});

// Link a Sponsor to a Child
app.post('/sponsorships', (req, res) => {
    const { sponsor_id, child_id } = req.body;
    let sql = 'INSERT INTO sponsorships (sponsor_id, child_id) VALUES (?, ?)';
    db.query(sql, [sponsor_id, child_id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: 'Sponsorship created' });
    });
});

// Get All Sponsors with Sponsored Children
app.get('/sponsors', (req, res) => {
    let sql = `
        SELECT sponsors.*, GROUP_CONCAT(children.name) AS sponsored_children 
        FROM sponsors 
        LEFT JOIN sponsorships ON sponsors.id = sponsorships.sponsor_id 
        LEFT JOIN children ON sponsorships.child_id = children.id 
        GROUP BY sponsors.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Get All Children with Their Sponsors
app.get('/children', (req, res) => {
    let sql = `
        SELECT children.*, GROUP_CONCAT(sponsors.name) AS sponsors 
        FROM children 
        LEFT JOIN sponsorships ON children.id = sponsorships.child_id 
        LEFT JOIN sponsors ON sponsorships.sponsor_id = sponsors.id 
        GROUP BY children.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});
