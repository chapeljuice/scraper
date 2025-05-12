#!/usr/bin/env bash
# exit on error
set -o errexit

yarn install
yarn build
npx puppeteer browsers install chrome 