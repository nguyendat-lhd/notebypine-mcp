#!/usr/bin/env bun

/**
 * Agent Feedback CLI Script
 * Interface for submitting and managing user feedback
 */

import { handleFeedbackCLI } from '../agent/helpers/feedback.js';

// Handle command line arguments
handleFeedbackCLI(process.argv.slice(2));