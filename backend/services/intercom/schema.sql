-- Table to track messages sent via Intercom
CREATE TABLE IF NOT EXISTS Intercom_Contacts (
    ID SERIAL PRIMARY KEY,
    UserID UUID NOT NULL, -- Assuming Users table uses UUID
    MessageType TEXT NOT NULL,
    SentAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Index for faster lookup by UserID
CREATE INDEX IF NOT EXISTS idx_intercom_contacts_userid ON Intercom_Contacts(UserID);
