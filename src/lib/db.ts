import mysql from 'mysql2/promise';

// As variáveis de ambiente são carregadas automaticamente pelo Next.js a partir do .env.local

let pool: mysql.Pool;

export function getDbPool() {
  if (pool) {
    return pool;
  }
  
  if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
    throw new Error('As variáveis de ambiente do banco de dados não foram definidas. Verifique seu arquivo .env.local');
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Ative o SSL se necessário para conexões seguras
    // ssl: {
    //   rejectUnauthorized: false
    // }
  });

  return pool;
}
