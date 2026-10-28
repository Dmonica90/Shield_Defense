#!/bin/sh
# Wraps the SCORM build (scorm/scormcontent/, from `npm run build:scorm`) in the
# SCORM 2004 4th Edition package from github.com/jeffbatt01/scorm-drivers and
# zips it for Workday. The drivers are fetched fresh on every run and copied
# unchanged; only the manifest's titles and identifier are edited.
set -eu

cd "$(dirname "$0")/.."
CONTENT=scorm/scormcontent
PACKAGE=scorm/package
ZIP=scorm/clip-shield-defense-scorm2004-4th.zip

[ -f "$CONTENT/index.html" ] || { echo "Missing $CONTENT/index.html; run npm run build:scorm first." >&2; exit 1; }

DRIVERS=$(mktemp -d)
trap 'rm -rf "$DRIVERS"' EXIT
curl -fsSL https://github.com/jeffbatt01/scorm-drivers/archive/refs/heads/main.tar.gz | tar xz -C "$DRIVERS"
BASE="$DRIVERS/scorm-drivers-main/2004-4th"

rm -rf "$PACKAGE" "$ZIP"
mkdir -p "$PACKAGE/core"
cp "$BASE/imsmanifest.xml" "$BASE/launcher.html" "$PACKAGE/"
# mock-api.js is for local testing only and must not ship.
cp "$BASE/core/scorm-driver.js" "$PACKAGE/core/"
cp -R "$CONTENT" "$PACKAGE/scormcontent"

sed -i.bak \
  -e 's|identifier="my-course-manifest"|identifier="clip-shield-defense-manifest"|' \
  -e 's|<title>My Course Title</title>|<title>Clip Shield Defense: False Security — Data Loss Prevention (DLP)</title>|' \
  -e 's|<title>My SCO Title</title>|<title>Clip Shield Defense: False Security — Data Loss Prevention (DLP)</title>|' \
  "$PACKAGE/imsmanifest.xml"
rm "$PACKAGE/imsmanifest.xml.bak"

# Zip the folder's contents so imsmanifest.xml sits at the archive root.
(cd "$PACKAGE" && zip -qr "../$(basename "$ZIP")" . -x '*.DS_Store')
echo "Package: $PACKAGE"
echo "ZIP:     $ZIP"
