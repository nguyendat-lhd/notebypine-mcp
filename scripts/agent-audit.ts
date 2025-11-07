#!/usr/bin/env bun

/**
 * Agent Audit CLI Script
 * Interface for running audits and compliance checks
 */

import { handleAuditCLI } from '../agent/helpers/auditor.js';

// Handle command line arguments
handleAuditCLI(process.argv.slice(2));