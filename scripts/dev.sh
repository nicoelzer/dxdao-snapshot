#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

npx truffle version
npx truffle compile
sleep 1
node scripts/information.js --network mainnet
