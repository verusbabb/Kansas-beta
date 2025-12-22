#!/bin/bash

# Check DNS propagation and site availability
# Update DOMAIN and API_DOMAIN variables below with your custom domains

# Configuration - Update these with your domains
DOMAIN="${DOMAIN:-yourdomain.com}"
API_DOMAIN="${API_DOMAIN:-api.yourdomain.com}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking DNS propagation and site availability...${NC}"
echo -e "${YELLOW}Checking domains: ${DOMAIN} and ${API_DOMAIN}${NC}"
echo ""

# Check DNS for frontend domain
echo -e "${BLUE}Checking DNS for ${DOMAIN}...${NC}"
DNS_RESULT=$(dig +short ${DOMAIN} A 2>/dev/null | head -1)

if [ -n "$DNS_RESULT" ]; then
  echo -e "${GREEN}✅ DNS is resolving: ${DNS_RESULT}${NC}"
  
  # Check if it's pointing to Google (should be one of the GCP IPs)
  if [[ "$DNS_RESULT" == "216.239.32.21" ]] || \
     [[ "$DNS_RESULT" == "216.239.34.21" ]] || \
     [[ "$DNS_RESULT" == "216.239.36.21" ]] || \
     [[ "$DNS_RESULT" == "216.239.38.21" ]]; then
    echo -e "${GREEN}✅ DNS is pointing to GCP!${NC}"
  else
    echo -e "${YELLOW}⚠️  DNS is resolving but may not be pointing to GCP yet${NC}"
  fi
else
  echo -e "${RED}❌ DNS not resolving yet. Still propagating...${NC}"
fi

echo ""

# Check if site is accessible via HTTPS
echo -e "${BLUE}Checking if https://${DOMAIN} is accessible...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://${DOMAIN} 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Site is live! (HTTP ${HTTP_CODE})${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
  echo -e "${RED}❌ Site not accessible yet (connection failed)${NC}"
  echo -e "${YELLOW}   This could mean:${NC}"
  echo -e "${YELLOW}   - DNS is still propagating${NC}"
  echo -e "${YELLOW}   - SSL certificate is still being provisioned${NC}"
else
  echo -e "${YELLOW}⚠️  Site returned HTTP ${HTTP_CODE}${NC}"
fi

echo ""

# Check API endpoint
echo -e "${BLUE}Checking if https://${API_DOMAIN} is accessible...${NC}"
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://${API_DOMAIN}/health 2>/dev/null)

if [ "$API_CODE" = "200" ]; then
  echo -e "${GREEN}✅ API is live! (HTTP ${API_CODE})${NC}"
elif [ "$API_CODE" = "000" ]; then
  echo -e "${RED}❌ API not accessible yet${NC}"
else
  echo -e "${YELLOW}⚠️  API returned HTTP ${API_CODE}${NC}"
fi

echo ""

# Summary
if [ "$HTTP_CODE" = "200" ] && [ "$API_CODE" = "200" ]; then
  echo -e "${GREEN}🎉 Everything is working! Your site is live!${NC}"
  echo -e "${BLUE}Frontend: https://${DOMAIN}${NC}"
  echo -e "${BLUE}Backend: https://${API_DOMAIN}${NC}"
else
  echo -e "${YELLOW}⏳ Still waiting for DNS/SSL...${NC}"
  echo -e "${YELLOW}   This can take up to an hour. Check again in a few minutes.${NC}"
  echo -e "${YELLOW}   Or update DOMAIN and API_DOMAIN variables in this script.${NC}"
fi

