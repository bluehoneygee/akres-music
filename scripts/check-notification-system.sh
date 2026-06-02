#!/bin/bash

echo "=== Notification Push Diagnosis ==="
echo ""

if [ -z "$ENV_URL" ]; then
  echo "Usage: ENV_URL=https://your-app.vercel.app CRON_SECRET=xxx ./check-notification-system.sh"
  exit 1
fi

echo "Environment: $ENV_URL"
echo ""

# 1. Check if Vercel Cron endpoint is accessible
echo "1️⃣  Checking Vercel Cron endpoint..."
CRON_RESPONSE=$(curl -s -w "\n%{http_code}" "$ENV_URL/api/cron/morning-notifications")
CRON_BODY=$(echo "$CRON_RESPONSE" | head -n -1)
CRON_STATUS=$(echo "$CRON_RESPONSE" | tail -n 1)

if [ "$CRON_STATUS" = "401" ]; then
  echo "   ✓ Endpoint exists (returns 401 as expected without auth)"
elif [ "$CRON_STATUS" = "200" ]; then
  echo "   ⚠️  Endpoint returned 200 - might be accepting requests without auth!"
else
  echo "   ❌ Unexpected status: $CRON_STATUS"
  echo "   Response: $CRON_BODY"
fi

echo ""

# 2. Test with manual trigger (if CRON_SECRET provided)
if [ -n "$CRON_SECRET" ]; then
  echo "2️⃣  Testing manual trigger with CRON_SECRET..."
  MANUAL_RESPONSE=$(curl -s "$ENV_URL/api/notifications/run?mode=morning&debug=true&secret=$CRON_SECRET")
  
  CREATED=$(echo "$MANUAL_RESPONSE" | jq -r '.data.classReminder.created // 0' 2>/dev/null)
  SKIPPED=$(echo "$MANUAL_RESPONSE" | jq -r '.data.classReminder.skipped // 0' 2>/dev/null)
  
  echo "   Created: $CREATED"
  echo "   Skipped: $SKIPPED"
  
  if [ "$CREATED" = "0" ] && [ "$SKIPPED" = "0" ]; then
    echo "   ❌ No schedules found or processed"
    echo "   Debug: Check if there are schedules for today with status 'Scheduled' or 'Rescheduled'"
  elif [ "$CREATED" -gt "0" ]; then
    echo "   ✓ Notifications created successfully"
    
    # Check recipients
    echo ""
    echo "   Recipients breakdown:"
    echo "$MANUAL_RESPONSE" | jq -r '.data.debug.schedules[] | "\(.targetRole): \(.recipientCount) recipients"' 2>/dev/null | sort | uniq
  fi
else
  echo "2️⃣  Skipping manual trigger test (CRON_SECRET not provided)"
fi

echo ""
echo "3️⃣  Potential Issues Checklist:"
echo ""
echo "   Vercel Cron Configuration:"
echo "   [ ] vercel.json exists with correct cron path"
echo "   [ ] Vercel project has cron enabled (Pro plan required)"
echo "   [ ] Check Vercel Dashboard → Project → Cron Jobs for execution logs"
echo ""
echo "   Environment Variables:"
echo "   [ ] CRON_SECRET is set (for manual triggers)"
echo "   [ ] VAPID_PUBLIC_KEY is set"
echo "   [ ] VAPID_PRIVATE_KEY is set"
echo "   [ ] VAPID_SUBJECT is set (e.g., mailto:admin@example.com)"
echo ""
echo "   Database:"
echo "   [ ] Schedules exist for today/tomorrow"
echo "   [ ] Schedules have status 'Scheduled' or 'Rescheduled'"
echo "   [ ] Users exist with correct roles (Music Instructor, Parent Portal User, Student Portal User)"
echo "   [ ] Users have correct links (instructorId, guardianId, studentId)"
echo "   [ ] Push subscriptions exist in push-subscriptions collection"
echo ""
echo "   Browser/Client:"
echo "   [ ] User enabled push notifications in browser"
echo "   [ ] Service worker is registered (/sw.js)"
echo "   [ ] Browser supports push notifications (HTTPS required)"
echo "   [ ] Push subscription not expired"
echo ""
echo "   Common Issues:"
echo "   - Vercel Cron only available on Pro plan"
echo "   - VAPID keys not set → push silently fails"
echo "   - User not subscribed → notification created but not pushed"
echo "   - Push subscription expired → needs re-subscription"
echo "   - Wrong schedule date/status → no notifications created"
echo ""

echo "4️⃣  Next Steps:"
echo ""
echo "   If CRON_SECRET is set but notifications not created:"
echo "   → Check database for schedules today"
echo ""
echo "   If notifications created but not pushed:"
echo "   → Check VAPID keys in environment"
echo "   → Check users have push subscriptions"
echo "   → Ask user to re-enable push notifications"
echo ""
echo "   If using Vercel Free plan:"
echo "   → Vercel Cron not available, use GitHub Actions or external cron service"
echo ""
