/* global it, describe, before */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const fetch = require('node-fetch');
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const SwaggerBank = require('../src/index');
const yamlFile = './test/mockYamls/hiking_guide/hiking_guide.yaml';

describe('setupMountebankImposter', function () {
  before(function setEnvVar () {
    process.env.PROP_GEN = 'static';
  });

  it('Should return a fulfilled promise when posting to Mountebank', function () {
    const api = new SwaggerBank.API(yamlFile);
    const response = api.validateAPI()
    .then(() => {
      return api.setupMountebankImposter(3000);
    });
    return response.should.eventually.be.fulfilled.and.contain.key('statusText');
  });

  it('Should return a correct mocked response from a swagger spec after Swaggerbank has Run', function () {
    const newApi = new SwaggerBank.API(yamlFile);
    return newApi.validateAPI()
    .then(() => {
      return newApi.setupMountebankImposter(3001);
    })
    .then(function () {
      return fetch('http://localhost:3001/v1/areas/someId/trails/15')
      .then(response => {
        return response.text();
      })
      .then(body => {
        return body.should.equal(JSON.stringify({'trail_id': '766b0150-3ee2-11e6-beb8-9e71128cae77', 'name': 'ran string', 'description': 'ran string', 'open': true, 'elevation': 42, 'distance': 42, 'random_attribute': {}, 'rating': 'ran string'}));
      });
    });
  });
});
