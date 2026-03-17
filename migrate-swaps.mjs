import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

await connection.execute(`
  CREATE TABLE IF NOT EXISTS material_swaps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materialId INT NOT NULL,
    swapMaterialId INT NOT NULL,
    swapReason TEXT,
    swapScore INT NOT NULL,
    swapTier ENUM('good', 'better', 'best') NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    createdBy ENUM('algorithm', 'agent', 'admin') NOT NULL,
    usageCount INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
  )
`);

console.log('✅ material_swaps table created');

await connection.end();
