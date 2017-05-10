/* global it, describe, before */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const SwaggerBank = require('../src/index');

describe('Constructor and validateAPI', function () {
  it('Constructor should throw an error on an invalid swagger spec path', function () {
    expect(function () {
      new SwaggerBank.API(300);
    }).to.throw('specPath must be a string');
  });

  it('Constructor should read in spec file and set up specFile instance variable', function () {
    const api = new SwaggerBank.API('./test/mockYamls/hiking_guide/hiking_guide.yaml');
    return api.specPath.should.equal('./test/mockYamls/hiking_guide/hiking_guide.yaml');
  });

  /* We use should.eventually to test validateAPI() because it returns a promise (chai-as-promised) */
  it('validateAPI should throw proper error on a swagger spec path that doesn\'t exist', function () {
    const missingYamlPath = './test/mockYamls/random_guide.yaml';
    const api = new SwaggerBank.API(missingYamlPath);
    return api.validateAPI().should.eventually.be.rejected.and.contain('no such file or directory');
  });

  it('validateAPI should throw proper error on a swagger spec that is invalid', function () {
    const badFormatYaml = './test/mockYamls/badFormatSpec.yaml';
    const api = new SwaggerBank.API(badFormatYaml);
    return api.validateAPI().should.eventually.be.rejected.and.contain(`Error parsing`);
  });

  describe('post successful validateAPI assertions', function () {
    let resolvedPromise;
    let api;
    before(function setupResolvedPromise () {
      const goodYaml = './test/mockYamls/hiking_guide/hiking_guide.yaml';
      api = new SwaggerBank.API(goodYaml);
      resolvedPromise = api.validateAPI();
      return resolvedPromise;
    });

    it('validateAPI should resolve with a valid yaml file and correctly set the apiObject instance variable', function () {
      return api.apiObject.should.have.keys('basePath', 'definitions', 'host', 'info', 'paths', 'produces', 'schemes', 'swagger', 'responses');
    });

    it('validateAPI should resolve with a valid yaml file and contain the api object as part of its promise ', function () {
      return resolvedPromise.should.eventually.be.fulfilled.and.have.keys('basePath', 'definitions', 'host', 'info', 'paths', 'produces', 'schemes', 'swagger', 'responses');
    });
  });
});

describe('Miscellaneous', function () {
  let api;
  before(function setupResolvedPromise () {
    const goodYaml = './test/mockYamls/emptyDefinitions.yaml';
    api = new SwaggerBank.API(goodYaml);
    return api.validateAPI();
  });
  it('getApiBasePath should return empty string if the apiObject does not specify a basePath', function () {
    api.getApiBasePath().should.equal('/');
  });

  it('getApiProducesType should return \'application/json\' if the apiObject does not specify a produces value', function () {
    api.getApiProducesType().should.equal('application/json');
  });
});
