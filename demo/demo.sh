#!/bin/bash

# Short TimeTracker CLI Demo for LinkedIn
# Quick 30-second demo showing the essential features

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to run command and show it
run_cmd() {
    echo -e "${YELLOW}$ $1${NC}"
    sleep 0.5
    eval $1
    sleep 1
}

clear
echo -e "${GREEN}TimeTracker CLI - Simple time tracking for developers${NC}"
sleep 1

run_cmd "tt start website-project"
run_cmd "tt stop"
run_cmd "tt log mobile-app 60"
run_cmd "tt log backend-api 45"
run_cmd "tt summary"

echo -e "\n${GREEN}get it now: npm install -g @mvexel/timetracker-cli${NC}"