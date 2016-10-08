// @mention people or teams when a label is applied
//
// This behavior looks for `.github/WATCHERS`, which includes a list of
// users or teams, and the labels they are watching:
//
//    @user bug feature help-wanted
//    @org/windows windows
//

module.exports = {webhook: 'issues', action: mention};

let handlebars = require('handlebars');
let message = "Hey {{ mentions }}, the `{{ label }}` label was added."

function mention(event, github, cb) {
  var payload = event.payload;

  if(payload.action != "labeled") return;
  console.log("watchers", event);

  var user = payload.repository.owner.login;
  var repo = payload.repository.name;
  var label = payload.label.name;

  // Get template from the repo
  github.repos.getContent({
    user: user,
    repo: repo,
    path: '.github/WATCHERS'
  }, function (err, data) {
    if (err) {
      console.log('ERROR', err);
      return;
    }

    // Get Watchers
    var content = new Buffer(data.content, 'base64').toString();
    watchers = {}
    content.split("\n").forEach(function(line) {
      labels = line.split(' ')
      watchers[labels.shift()] = labels;
    });

    // TODO: make customizable
    var template = handlebars.compile(message);

    var mentions = Object.keys(watchers).filter(function(mention) {
      return watchers[mention].includes(label);
    });

    // Post issue comment
    github.issues.createComment({
      user: user,
      repo: repo,
      number: payload.issue.number,
      body: template({mentions: mentions.join(", "), label: label})
    }, function (err, res) {
      if (err) {
        console.log('ERROR', err, res);
      }
      cb();
    });
  });
}
