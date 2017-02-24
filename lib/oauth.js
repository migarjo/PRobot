const GitHubApi = require('github');
const fs = require('fs');
const jwt = require('./jwt');
const log = require('./log');
const process = require('process');

module.exports = {auth};

const cert = process.env.PRIVATE_KEY || fs.readFileSync('private-key.pem');

const enableDebug = log.level() <= 10;

// Authenticate as the given installation
function auth() {
  const github = new GitHubApi({debug: enableDebug});

  github.authenticate({
      type: "token",
      token: process.env.TOKEN
      //key: process.env.CLIENT_ID,
      //secret: process.env.CLIENT_SECRET
  })
  return Promise.resolve(github);
}
