# Database Schemas

This directory contains database schemas and migration files for the GreenChainz platform.

## MVP Schema

The `mvp_schema.sql` file contains the complete schema for the Minimum Viable Product (MVP). It is designed to be idempotent, meaning it can be run multiple times without causing errors or creating duplicate objects.

### How to Run the MVP Schema Script

1.  **Navigate to the Supabase SQL Editor:**
    *   Open your Supabase project.
    *   In the left sidebar, click on the **SQL Editor** icon.
2.  **Create a New Query:**
    *   Click on **"New query"**.
3.  **Load and Run the Script:**
    *   Copy the entire content of `mvp_schema.sql`.
    *   Paste the content into the Supabase SQL editor.
    *   Click **"RUN"**.

The script will create all the necessary tables, enums, relationships, and indexes for the MVP.
