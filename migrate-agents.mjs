import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function migrate() {
  const conn = await mysql.createConnection(DATABASE_URL);

  const queries = [
    `CREATE TABLE IF NOT EXISTS agent_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      sessionId VARCHAR(255) NOT NULL,
      agent VARCHAR(50) NOT NULL,
      role ENUM('user', 'assistant', 'system') NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS agent_analytics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sessionId VARCHAR(255) NOT NULL,
      agent VARCHAR(50) NOT NULL,
      intentClassified VARCHAR(100),
      confidence DECIMAL(3,2),
      toolsUsed TEXT,
      responseTimeMs INT,
      escalated TINYINT DEFAULT 0,
      handedOffToHuman TINYINT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_conv_session ON agent_conversations(sessionId)`,
    `CREATE INDEX IF NOT EXISTS idx_conv_user ON agent_conversations(userId)`,
    `CREATE INDEX IF NOT EXISTS idx_analytics_session ON agent_analytics(sessionId)`,
  ];

  for (const q of queries) {
    try {
      await conn.execute(q);
      console.log("OK:", q.substring(0, 60) + "...");
    } catch (err) {
      if (err.code === "ER_DUP_KEYNAME") {
        console.log("SKIP (exists):", q.substring(0, 60) + "...");
      } else {
        console.error("FAIL:", err.message);
      }
    }
  }

  await conn.end();
  console.log("Agent tables migration complete.");
}

migrate().catch(console.error);
