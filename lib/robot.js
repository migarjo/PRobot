const log = require('./log');
const installations = require('./installations');
const Context = require('./context');
const Configuration = require('./configuration');
const Oauth = require('./oauth');

class Robot {
  listen(webhook) {
    webhook.on('*', this.receive.bind(this));
  }

  receive(event) {
    log.trace('webhook', event);

    if (!event.payload.repository) {
      event.payload.repository = {
        name: 'probot-scripts',
        owner: event.payload.organization
      };
    }
    if (!event.payload.installation){
      Oauth.auth().then(github => {
        const context = new Context(github, event);
        Configuration.load(context, '.probot.js').then(config => {
          return config.execute();
        });
      });
    }
    else {
      installations.auth(event.payload.installation.id).then(github => {
        const context = new Context(github, event);
        Configuration.load(context, '.probot.js').then(config => {
          return config.execute();
        });
      });
    }
  }
}

module.exports = new Robot();
