if [ ! -d "./node_modules/seneca" ]; then
  npm install seneca
fi
./node_modules/.bin/lab test/*.test.js -r console -v
