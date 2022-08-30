#!/usr/bin/env bash

# Set colors
GREEN='\033[1;32m'
CYAN='\033[1;36m'
NC='\033[0m'

printf "${GREEN}----${NC}"

echo

# Set user email
git config --local user.email "carrusel@carrusel_bot_service.com"
printf "${CYAN}User email 'carrusel@carrusel_bot_service.com' was set.${NC}"

echo
echo

# Set user name
git config --local user.name "carrusel_bot"
printf "${CYAN}User name 'carrusel_bot' was set.${NC}"
echo
printf "${GREEN}----${NC}"
