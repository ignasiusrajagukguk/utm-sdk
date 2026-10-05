RUN THIS IN sdk FOLDER TO GENERATE NEW sdk.js AFTER CHANGING index.js FILE
npx esbuild src/index.js --bundle --minify --format=iife --outfile=dist/sdk.js
# utm-sdk
