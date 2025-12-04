#!/bin/bash
set -euo pipefail

BASE_URL="https://lxd-development-app/api/v1"
CONTENT_TYPE="Content-Type: application/json"
RANDOM=$((RANDOM % 10000))

echo "Select a request to run:"
echo "1) Health check"
echo "20) Create User"
echo "21) List Users"
echo "22) Verify User"
echo "30) Donate"
echo "31) List Gifts"
read -rp "Enter choice [1-4]: " choice

case "$choice" in
  1)
    echo "👉 Running health check..."
    curl -sk "$BASE_URL/health" -H "$CONTENT_TYPE" | jq || true
    ;;
  20)
    echo "👉 Creating user..."
    curl -sk -X POST "$BASE_URL/auth/register" \
      -H "$CONTENT_TYPE" \
      -d '{
        "name": "Jane Doe",
        "email": "jane.doe+'$RANDOM'@example.com",
        "phone": "123-456-7890",
        "address": "123 Main St, Anytown, USA",
        "password": "123456"
      }' | jq || true
    ;;
  21)
    echo "👉 Listing users..."
    curl -sk -X GET "$BASE_URL/users" -H "$CONTENT_TYPE" | jq || true
    ;;
  22)
    echo "👉 Verifying user..."
    curl -sk -X POST "$BASE_URL/auth/verify" \
      -H "$CONTENT_TYPE" \
      -d '{
        "verification_code": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImphbmUuZG9lKzI5NzY3QGV4YW1wbGUuY29tIiwiZXhwIjoxNzU4NDcwOTExLCJpYXQiOjE3NTgyMTE3MTF9.PGERDlBlgJO8jri7Hfmgp1Tn1BGsz0bnA5S6GcknivQ"
      }' | jq || true
    ;;
  30)
    echo "👉 Sending donation request..."
    curl -sk -X POST "$BASE_URL/donate" \
      -H "$CONTENT_TYPE" \
      -d '{
        "donor_id": 1,
        "type": "book",
        "description": "A set of classic novels",
        "quantity": 5,
        "condition": "good"
      }' | jq || true
    ;;
  31)
    echo "👉 Listing gifts..."
    curl -sk -X GET "$BASE_URL/gifts" -H "$CONTENT_TYPE" | jq || true
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac
