/* global it, describe, before */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const rewire = require('rewire');
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const config = require('../config/options.js');

const RANDOM_STRING_LENGTH = config.randomStringLength;

const SwaggerBank = require('../src/index');
const responseManager = rewire('../src/responseManager');
const validator = require('validator');

describe('getAllResponsesForApi: ', function () {
  let hikingAPI;
  let hikingAPIWithoutExamples;

  before(function preValidateAPI () {
    hikingAPI = new SwaggerBank.API('./test/mockYamls/hiking_guide/hiking_guide.yaml');
    hikingAPIWithoutExamples = new SwaggerBank.API('./test/mockYamls/missingExamplesHiking.yaml');
    return Promise.all([hikingAPI.validateAPI(), hikingAPIWithoutExamples.validateAPI()]);
  });

  describe('Response generation when PROP_GEN is set to example', function () {
    before(function setEnvVar () {
      process.env.PROP_GEN = 'example';
    });
    it('Should throw an error if an API without an examples section is provided', function () {
      expect(function () {
        hikingAPIWithoutExamples.getAllResponsesForApi();
      }).to.throw('ERROR: process.env.PROP_GEN was set to example but the response for /areas get 200 did NOT contain an examples section');
    });

    it('Should return a valid list of responses for a simple API that has examples for each route', function () {
      const responses = hikingAPI.getAllResponsesForApi();
      responses[9].should.containSubset({
        'uri': '/v1/areas/\\w+/trails/\\d+$',
        'verb': 'DELETE',
        'res': {
          'statusCode': 200,
          'responseHeaders': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          "responseBody": "{\"trail_id\":\"590481d2-3efa-11e6-beb8-9e71128cae77\",\"name\":\"a_random_trail_name\",\"description\":\"a random string for trail description\",\"open\":\"false\",\"elevation\":29029,\"distance\":134,\"rating\":1}"
        }
      });
    });
  });

  describe('Response generation when PROP_GEN is set to static', function () {
    before(function setEnvVar () {
      process.env.PROP_GEN = 'static';
    });
    it('Should return a valid list of static responses for a simple API that has NO examples for its routes (generation of random responses)', function () {
      console.log(`ENV: ${process.env.PROP_GEN}`);
      const responses = hikingAPIWithoutExamples.getAllResponsesForApi();
      responses[9].should.containSubset({
        'uri': '/v1/areas/\\w+/trails/\\d+$',
        'verb': 'DELETE',
        'res': {
          'statusCode': 200,
          'responseHeaders': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          "responseBody": "{\"trail_id\":\"766b0150-3ee2-11e6-beb8-9e71128cae77\",\"name\":\"ran string\",\"description\":\"ran string\",\"distance\":42,\"rating\":\"ran string\"}"
        }
      });
    });
    it('Should return a valid list of STATIC responses for a simple API that HAS examples for its routes even with an example section present', function () {
      console.log(`ENV: ${process.env.PROP_GEN}`);
      const responses = hikingAPI.getAllResponsesForApi();
      responses[9].should.containSubset({
        'uri': '/v1/areas/\\w+/trails/\\d+$',
        'verb': 'DELETE',
        'res': {
          'statusCode': 200,
          'responseHeaders': { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          "responseBody": "{\"trail_id\":\"766b0150-3ee2-11e6-beb8-9e71128cae77\",\"name\":\"ran string\",\"description\":\"ran string\",\"open\":true,\"elevation\":42,\"distance\":42,\"random_attribute\":{},\"rating\":\"ran string\"}"
        }
      });
    });
  });
});

describe('propertyGeneration: ', function () {
  const responseManagerGenerateString = responseManager.__get__('generateString');
  const responseManagerPropertyGenerator = responseManager.__get__('propertyGenerator');

  describe('Generic propertyGeneration', function () {
    it('Should properly handle a property type that isn\'t yet supported', function () {
      responseManagerPropertyGenerator('object').should.deep.equal({});
    });
  });

  describe('Random String Generation: ', function () {
    before(function setEnvVar () {
      process.env.PROP_GEN = 'random';
    });

    it('Should return a valid random uuid when the format type is uuid', function () {
      validator.isUUID(responseManagerGenerateString('uuid')).should.be.true;
    });

    it('Should return a valid random email address when the format type is email', function () {
      validator.isEmail(responseManagerGenerateString('email')).should.be.true;
    });

    it('Should return a valid random date when the format type is date', function () {
      validator.isDate(responseManagerGenerateString('date-time')).should.be.true;
    });

    it('Should return a valid random word if no type is specified', function () {
      validator.isLength(responseManagerGenerateString(), { 'min': RANDOM_STRING_LENGTH, 'max': RANDOM_STRING_LENGTH }).should.be.true;
    });

    it('Should return a valid element from a passed in enum', function () {
      ['1', '2', '3', '4', '5'].should.contain(responseManagerGenerateString(null, ['1', '2', '3', '4', '5']));
    });

    it('Should return a static response for a custom format type that IS supplied in the config', function () {
      responseManagerGenerateString('palindrome').should.equal('racecar');
    });

    it('Should throw an error for a custom format type that is NOT supplied in the config', function () {
      expect(function () {
        responseManagerGenerateString('ipv6');
      }).to.throw('ERROR: No value found for GenerationOptions[ipv6]. Please specify a value for ipv6 even if you wish to use random generation');
    });
  });

  describe('Static String Generation: ', function () {
    before(function setEnvVar () {
      process.env.PROP_GEN = 'static';
    });
    const responseManagerGenerateString = responseManager.__get__('generateString');

    it('Should return a preset static uuid when the format type is uuid', function () {
      validator.isUUID(responseManagerGenerateString('uuid')).should.be.true;
    });

    it('Should return a preset static email address when the format type is email', function () {
      validator.isEmail(responseManagerGenerateString('email')).should.be.true;
    });

    it('Should return a preset static date when the format type is date', function () {
      validator.isDate(responseManagerGenerateString('date-time')).should.be.true;
    });

    it('Should return a preset static word if no type is specified', function () {
      validator.isLength(responseManagerGenerateString(), { 'min': RANDOM_STRING_LENGTH, 'max': RANDOM_STRING_LENGTH }).should.be.true;
    });
  });
});
