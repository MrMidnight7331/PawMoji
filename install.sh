#!/usr/bin/env bash
set -e

# 1. Require root
if [[ $EUID -ne 0 ]]; then
  echo "❌ This installer must be run as root. Please re-run with sudo."
  exit 1
fi

# 2. Check npm
if ! command -v npm &>/dev/null; then
  echo "❌ npm is not installed. Please install Node.js and npm, then re-run this script."
  exit 1
fi

# 3. Clone into /tmp
cd /tmp
REPO_URL="https://github.com/MrMidnight7331/PawMoji.git"
WORKDIR="pawmoji-install"
rm -rf "$WORKDIR"
echo "➡️ Cloning repository..."
git clone "$REPO_URL" "$WORKDIR"
cd "$WORKDIR/app"

# 4. Build
echo "➡️ Installing dependencies..."
npm install
echo "➡️ Building app..."
npm run build

# 5. Deploy AppImage
cd dist
echo "➡️ Preparing AppImage..."
chmod +x *.AppImage

# 6. Copy to /opt/PawMoji/pawmoji.appimage
TARGET_DIR="/opt/PawMoji"
TARGET_FILE="pawmoji.appimage"
echo "➡️ Installing to $TARGET_DIR/$TARGET_FILE..."
mkdir -p "$TARGET_DIR"
cp *.AppImage "$TARGET_DIR/$TARGET_FILE"
chmod +x "$TARGET_DIR/$TARGET_FILE"

# 7. Symlink into /usr/local/bin
echo "➡️ Creating executable link..."
ln -sf "$TARGET_DIR/$TARGET_FILE" /usr/local/bin/pawmoji

# 8. Finish
echo "✅ Installed PawMoji! Run it with: pawmoji"
echo "🚀 Launching PawMoji now..."
pawmoji &

exit 0
