#!/bin/sh
# Install Sar AI on a cable-connected iPhone as a real (Release) app: no Metro,
# no developer menu, JS bundled inside. docs/BACKEND.md → "Testing on an iPhone".
#
#   npm run ios:device            talks to the local Supabase over this Mac's Wi-Fi
#   npm run ios:device -- --debug Debug build that loads JS from the Metro this starts (hot reload)
#
# The backend address is baked in at build time, so the phone only syncs while it
# is on the same Wi-Fi as this Mac with `npm run db:start` running. Away from it,
# the app works offline as usual. Rebuild if the Mac's address changes.
set -e

# CocoaPods installed per user (gem install --user-install), see docs/BACKEND.md.
export LANG=en_US.UTF-8
export GEM_HOME="$HOME/.gem/ruby/2.6.0"
export PATH="$GEM_HOME/bin:$PATH"

CONFIG=Release
if [ "$1" = "--debug" ]; then CONFIG=Debug; fi

LAN_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || true)
if [ -z "$LAN_IP" ]; then
  echo "No Wi-Fi address found: connect this Mac to the same Wi-Fi as the iPhone." >&2
  exit 1
fi
# A variable set here wins over .env.local (which holds the Android emulator's 10.0.2.2).
# Debug builds get it too: the Metro started below inherits it.
export EXPO_PUBLIC_SUPABASE_URL="http://$LAN_IP:54321"
echo "Backend for this build: $EXPO_PUBLIC_SUPABASE_URL"

exec npx expo run:ios --device --configuration "$CONFIG"
