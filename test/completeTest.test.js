/* global it, describe, before */

'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const fetch = require('node-fetch');
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const SwaggerBank = require('../src/index');

describe('End to End Testing with multiple APIs', function () {
  let slackAPI;
  let contrivedSlackAPI;
  before(function preValidateAPI () {
    slackAPI = new SwaggerBank.API('./test/mockYamls/validSlack.yaml');
    contrivedSlackAPI = new SwaggerBank.API('./test/mockYamls/miscSlack.yaml');
    return Promise.all([slackAPI.validateAPI(), contrivedSlackAPI.validateAPI()]);
  });

  describe('Valid Slack API', function () {
    before(function setEnvVar () {
      process.env.PROP_GEN = 'static';
    });

    it('Should return a correct mocked response from a swagger spec after Swaggerbank has Run', function () {
      return slackAPI.setupMountebankImposter(3002)
      .then(function () {
        return fetch('http://localhost:3002/api/channels.info')
        .then(response => {
          return response.text();
        })
        .then(body => {
          return body.should.equal(JSON.stringify({'channel': {'created': 42, 'creator': 'ran string', 'id': 'ran string', 'is_archived': true, 'is_channel': true, 'is_general': true, 'is_member': true, 'last_read': 'ran string', 'latest': {'attachments': [{'fallback': 'ran string', 'from_url': 'ran string', 'id': 42, 'image_bytes': 42, 'image_height': 42, 'image_url': 'ran string', 'image_width': 42, 'service_name': 'ran string', 'text': 'ran string', 'title': 'ran string', 'title_link': 'ran string'}, {'fallback': 'ran string', 'from_url': 'ran string', 'id': 42, 'image_bytes': 42, 'image_height': 42, 'image_url': 'ran string', 'image_width': 42, 'service_name': 'ran string', 'text': 'ran string', 'title': 'ran string', 'title_link': 'ran string'}, {'fallback': 'ran string', 'from_url': 'ran string', 'id': 42, 'image_bytes': 42, 'image_height': 42, 'image_url': 'ran string', 'image_width': 42, 'service_name': 'ran string', 'text': 'ran string', 'title': 'ran string', 'title_link': 'ran string'}], 'text': 'ran string', 'ts': 'ran string', 'type': 'ran string', 'user': 'ran string'}, 'members': ['ran string', 'ran string', 'ran string'], 'name': 'ran string', 'purpose': {'creator': 'ran string', 'last_set': 42, 'value': 'ran string'}, 'topic': {'creator': 'ran string', 'last_set': 42, 'value': 'ran string'}, 'unread_count': 42, 'unread_count_display': 42}, 'ok': true}));
        });
      });
    });
  });

  describe('Contrived Slack API', function () {
    before(function setEnvVar () {
      process.env.PROP_GEN = 'static';
      return Promise.all([contrivedSlackAPI.setupMountebankImposter(3003)]);
    });

    it('setTopic route: Testing array of in place defined objects', function () {
      return fetch('http://localhost:3003/api/channels.setTopic')
      .then(response => {
        return response.text();
      })
      .then(body => {
        return body.should.equal(JSON.stringify(
          {'topic': [
            {
              'ok': true,
              'topic': 'ran string'
            },
            {
              'ok': true,
              'topic': 'ran string'
            },
            {
              'ok': true,
              'topic': 'ran string'
            }
          ]}
        ));
      });
    });

    it('users route: Testing array of referenced objects', function () {
      return fetch('http://localhost:3003/api/users')
      .then(response => {
        return response.text();
      })
      .then(body => {
        return body.should.equal(JSON.stringify(
          {'userList': [
            {
              'ok': true,
              'team': 'ran string',
              'team_id': 'ran string',
              'url': 'ran string',
              'user': 'ran string',
              'user_id': 'ran string'
            },
            {
              'ok': true,
              'team': 'ran string',
              'team_id': 'ran string',
              'url': 'ran string',
              'user': 'ran string',
              'user_id': 'ran string'
            },
            {
              'ok': true,
              'team': 'ran string',
              'team_id': 'ran string',
              'url': 'ran string',
              'user': 'ran string',
              'user_id': 'ran string'
            }
          ]}
        ));
      });
    });
  });
});
