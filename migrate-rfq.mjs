import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

const rfqTablesSql = [
  `CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    companyName VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    isPremium BOOLEAN DEFAULT FALSE,
    premiumExpiresAt DATETIME,
    sustainabilityScore DECIMAL(5,2) DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`,
  
  `CREATE TABLE IF NOT EXISTS supplier_filters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplierId INT NOT NULL,
    materialTypes JSON,
    locations JSON,
    minLeadDays INT DEFAULT 0,
    maxLeadDays INT DEFAULT 60,
    minPrice DECIMAL(10,2) DEFAULT 0,
    maxPrice DECIMAL(10,2) DEFAULT 999999,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS rfq_bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfqId INT NOT NULL,
    supplierId INT NOT NULL,
    bidPrice DECIMAL(12,2) NOT NULL,
    leadDays INT NOT NULL,
    notes TEXT,
    status ENUM('submitted', 'accepted', 'rejected', 'expired') DEFAULT 'submitted',
    expiresAt DATETIME,
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    acceptedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rfqId) REFERENCES rfqs(id) ON DELETE CASCADE,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rfq_supplier (rfqId, supplierId)
  )`,

  `CREATE TABLE IF NOT EXISTS rfq_threads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rfqId INT NOT NULL,
    supplierId INT NOT NULL,
    buyerId INT NOT NULL,
    lastMessageAt DATETIME,
    lastMessageContent TEXT,
    unreadByBuyer INT DEFAULT 0,
    unreadBySupplier INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rfqId) REFERENCES rfqs(id) ON DELETE CASCADE,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rfq_supplier_buyer (rfqId, supplierId, buyerId)
  )`,

  `CREATE TABLE IF NOT EXISTS rfq_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    threadId INT NOT NULL,
    senderId INT NOT NULL,
    content VARCHAR(1000) NOT NULL,
    isRead BOOLEAN DEFAULT FALSE,
    readAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (threadId) REFERENCES rfq_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type ENUM('rfq_match', 'new_message', 'bid_accepted', 'bid_rejected', 'rfq_closed') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    relatedId INT,
    isRead BOOLEAN DEFAULT FALSE,
    readAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS idx_suppliers_userId ON suppliers(userId)`,
  `CREATE INDEX IF NOT EXISTS idx_suppliers_isPremium ON suppliers(isPremium)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_bids_rfqId ON rfq_bids(rfqId)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_bids_supplierId ON rfq_bids(supplierId)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_bids_status ON rfq_bids(status)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_threads_rfqId ON rfq_threads(rfqId)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_threads_supplierId ON rfq_threads(supplierId)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_messages_threadId ON rfq_messages(threadId)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)`,
];

async function migrate() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  for (const sql of rfqTablesSql) {
    try {
      await conn.execute(sql);
      console.log('OK:', sql.substring(0, 80) + '...');
    } catch (err) {
      console.error('ERROR:', err.message);
    }
  }
  
  await conn.end();
  console.log('\nRFQ marketplace tables migration complete.');
}

migrate().catch(console.error);
