#!/usr/bin/env bash
# No-sudo persistence stopgap: start the site only if nothing holds :3200.
# Guarded so it is harmless if auren-site.service is installed later - if
# systemd already started it, this exits without launching a second copy.
sleep 20
if (echo > /dev/tcp/127.0.0.1/3200) 2>/dev/null; then
  echo "$(date -Is) :3200 already up, nothing to do"; exit 0
fi
cd /home/shihai/auren-bot/site || exit 1
export NODE_ENV=production
exec /usr/bin/node node_modules/next/dist/bin/next start -p 3200
