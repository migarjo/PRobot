const Plugin = require('../plugin');

module.exports = class PullRequests extends Plugin {
  status(context, state, options) {
    const sha = context.payload.pull_request.head.sha;

    return context.github.repos.createStatus(
      context.toRepo(Object.assign({state, sha}, options))
    );
  }
};
