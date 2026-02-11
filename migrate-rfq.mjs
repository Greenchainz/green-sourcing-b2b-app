import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL.split('@')[1].split('/')[0],
  user: process.env.DATABASE_URL.split('://')[1].split(':')[0],
  password: process.env.DATABASE_URL.split(':')[2].split('@')[0],
  database: process.env.DATABASE_URL.split('/').pop(),
});

const sql = `
-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  companyName VARCHAR(255) NOT NULL,
  website LONGTEXT,
  logoUrl LONGTEXT,
  phone VARCHAR(50),
  email VARCHAR(320) NOT NULL,
  address LONGTEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zipCode VARCHAR(20),
  country VARCHAR(100),
  isPremium TINYINT DEFAULT 0,
  premiumExpiresAt TIMESTAMP NULL,
  sustainabilityScore DECIMAL(3,2),
  verified TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Supplier Subscriptions
CREATE TABLE IF NOT EXISTS supplier_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplierId INT NOT NULL,
  tier ENUM('free', 'premium') DEFAULT 'free',
  stripeSubscriptionId VARCHAR(255),
  stripeCustomerId VARCHAR(255),
  status ENUM('active', 'canceled', 'past_due') DEFAULT 'active',
  renewalDate TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Supplier Filters
CREATE TABLE IF NOT EXISTS supplier_filters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplierId INT NOT NULL,
  materialTypeId INT,
  minPrice DECIMAL(10,2),
  maxPrice DECIMAL(10,2),
  minLeadDays INT,
  maxLeadDays INT,
  serviceRadius INT,
  acceptedLocations LONGTEXT,
  minOrderQuantity DECIMAL(12,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- RFQ Bids
CREATE TABLE IF NOT EXISTS rfq_bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfqId INT NOT NULL,
  supplierId INT NOT NULL,
  status ENUM('submitted', 'accepted', 'rejected', 'expired') DEFAULT 'submitted',
  bidPrice DECIMAL(12,2),
  leadDays INT,
  notes LONGTEXT,
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- RFQ Threads
CREATE TABLE IF NOT EXISTS rfq_threads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfqId INT NOT NULL,
  supplierId INT NOT NULL,
  buyerId INT NOT NULL,
  status ENUM('active', 'closed', 'archived') DEFAULT 'active',
  lastMessageAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- RFQ Messages
CREATE TABLE IF NOT EXISTS rfq_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  threadId INT NOT NULL,
  senderId INT NOT NULL,
  senderType ENUM('buyer', 'supplier') NOT NULL,
  content LONGTEXT NOT NULL,
  isRead TINYINT DEFAULT 0,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type ENUM('rfq_match', 'new_message', 'bid_accepted', 'bid_rejected', 'rfq_closed') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  relatedRfqId INT,
  relatedThreadId INT,
  isRead TINYINT DEFAULT 0,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RFQ Analytics
CREATE TABLE IF NOT EXISTS rfq_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfqId INT NOT NULL,
  totalBidsReceived INT DEFAULT 0,
  avgBidPrice DECIMAL(12,2),
  lowestBidPrice DECIMAL(12,2),
  highestBidPrice DECIMAL(12,2),
  avgResponseTimeHours DECIMAL(5,2),
  winningBidId INT,
  purchasedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

const statements = sql.split(';').filter(s => s.trim());
for (const statement of statements) {
  try {
    await connection.execute(statement);
    console.log('✓', statement.split('\n')[0]);
  } catch (err) {
    console.log('✗', statement.split('\n')[0], err.message);
  }
}

await connection.end();
console.log('Migration complete!');
