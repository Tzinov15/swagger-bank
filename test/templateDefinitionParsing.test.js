/* global it, describe, before */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const SwaggerBank = require('../src/index');

describe('Template Construction', function () {
  describe('getAllObjectDefinitions', function () {
    let hikingAPI;
    let emptyDefinitionsAPI;
    before(function setupUpTwoAPIs () {
      const hikingYAML = './test/mockYamls/hiking_guide/hiking_guide.yaml';
      const authYAML = './test/mockYamls/auth.yaml';
      const emptyDefinitionsYaml = './test/mockYamls/emptyDefinitions.yaml';
      hikingAPI = new SwaggerBank.API(hikingYAML);
      emptyDefinitionsAPI = new SwaggerBank.API(emptyDefinitionsYaml);
      return Promise.all([hikingAPI.validateAPI(), emptyDefinitionsAPI.validateAPI()]);
    });

    it('Should return a correct definitions object ', function () {
      return hikingAPI.getAllObjectDefinitions().should.have.keys('area', 'trail', 'error');
    });

    it('Should throw an error if the definitions section is empty', function () {
      expect(function () {
        return emptyDefinitionsAPI.getAllObjectDefinitions();
      }).to.throw('Please provide any object references inside a \'definitions\' section inside your swagger spec');
    });
  });

  describe('constructTemplateForRef', function () {
    let hikingAPI;
    before(function setupApi () {
      const hikingYAML = './test/mockYamls/hiking_guide/hiking_guide.yaml';
      hikingAPI = new SwaggerBank.API(hikingYAML);
      return hikingAPI.validateAPI();
    });

    describe('Input Validation', function () {
      it('Should throw an error if ref is not an object', function () {
        expect(function () {
          hikingAPI.constructTemplateForRef('hello', 'hi');
        }).to.throw('refSchema must be an object');
      });
      it('Should throw an error if refName is not a string', function () {
        expect(function () {
          hikingAPI.constructTemplateForRef({ 'someProperty': 'hello' }, { 'um': 'no' });
        }).to.throw('refName must be a string');
      });
    });

    it('Should return a valid template containing the same keys as the original definitions object when provided a reference object name and its respective schema', function () {
      const apiDefinitions = hikingAPI.getAllObjectDefinitions();
      const refName = 'area';
      const refTemplate = apiDefinitions[refName];
      const originalDefinitionProperties = Object.keys(refTemplate.properties);
      const constructedTemplateProperties = Object.keys(hikingAPI.constructTemplateForRef(refTemplate, refName));
      return originalDefinitionProperties.should.deep.equal(constructedTemplateProperties);
    });

    it('Should return a valid template that contains the necessary information to reconstruct the object with random data', function () {
      const apiDefinitions = hikingAPI.getAllObjectDefinitions();
      const refName = 'trail';
      const refTemplate = apiDefinitions[refName];
      const constructedTemplate = hikingAPI.constructTemplateForRef(refTemplate, refName);
      constructedTemplate.should.containSubset({ 'trail_id': { 'type': 'string', 'format': 'uuid' } });
    });
  });

  describe('constructAllRefs', function () {
    let hikingAPI;
    before(function setupApi () {
      const hikingYAML = './test/mockYamls/hiking_guide/hiking_guide.yaml';
      hikingAPI = new SwaggerBank.API(hikingYAML);
      return hikingAPI.validateAPI();
    });
    it('Global template hash should contain the same keys as the orignal defitions section of the swagger spec', function () {
      const apiDefinitions = hikingAPI.getAllObjectDefinitions();
      const apiDefinitionKeys = Object.keys(apiDefinitions);
      const globalTemplateHashKeys = Object.keys(hikingAPI.constructAllRefs(apiDefinitions));
      apiDefinitionKeys.should.deep.equal(globalTemplateHashKeys);
    });
  });
});
