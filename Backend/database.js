const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create MySQL connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || ' 192.168.226.174',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Behara@123',
  database: process.env.DB_NAME || 'aws_users',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to MySQL:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL Database Successfully!');
});

module.exports = connection;