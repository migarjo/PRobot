const expect = require('expect');
const Plugin = require('../../lib/plugins/pull-requests');
const Context = require('../../lib/context');
const payload = require('../fixtures/webhook/pull_request_review_comment.created.json');

const plugin = new Plugin();

describe('pull requests plugin', () => {
  let context;
  let github;

  before(() => {
    github = {
      repos: {
        createStatus: expect.createSpy()
      }
    };
    context = new Context(github, {payload});
  });

  describe('status', () => {
    it('sets the given status', () => {
      plugin.status(context, 'failure', {context: 'probot'});

      expect(github.repos.createStatus).toHaveBeenCalledWith({
        owner: 'bkeepers-inc',
        repo: 'test',
        sha: 'd90d08599501cec59c5682cfcd9c212aa48eb9a5',
        state: 'failure',
        context: 'probot'
      });
    });
  });
});
