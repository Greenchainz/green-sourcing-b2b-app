#!/usr/bin/env node

/**
 * Custom Next.js server for Azure Container Apps
 * Delegates to the Next.js standalone server
 */

const port = parseInt(process.env.PORT || '3000', 10);

// Next.js standalone server expects PORT to be set before require
process.env.PORT = port;

// Load and start the Next.js server from the standalone build
require('./.next/standalone/server.js');

