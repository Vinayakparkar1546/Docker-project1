const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'fittrack_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'fittrack',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(120) NOT NULL,
      age TINYINT UNSIGNED NOT NULL,
      activity VARCHAR(40) NOT NULL,
      goal VARCHAR(60) NOT NULL,
      timeline VARCHAR(40) NOT NULL,
      workout VARCHAR(40) NOT NULL,
      equipment VARCHAR(60) NOT NULL,
      days TINYINT UNSIGNED NOT NULL,
      duration VARCHAR(40) NOT NULL,
      sleep VARCHAR(40) NOT NULL,
      water VARCHAR(40) NOT NULL,
      diet VARCHAR(40) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database table survey_responses is ready');
}

module.exports = { pool, initializeDatabase };
