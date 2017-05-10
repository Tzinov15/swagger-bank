/* global it, describe, before */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiSubset = require('chai-subset');
const expect = chai.expect;
const should = chai.should();
chai.use(chaiAsPromised);
chai.use(chaiSubset);

const urlManager = require('../src/urlManager');
const SwaggerBank = require('../src/index');

// TODO: When we add logic to urlManager for also parsing required query parameters, we need to add tests for that as well

describe('getParametersObject:', function () {
  let hikingAPI;

  before(function preValidateAPI () {
    hikingAPI = new SwaggerBank.API('./test/mockYamls/hiking_guide/hiking_guide.yaml');
    return Promise.all([hikingAPI.validateAPI()]);
  });

  it('Should throw the right error when supplying a uri that doesn\'t exist', function () {
    expect(function () {
      hikingAPI.getParametersObject({ 'uri': '/areas/{area_idd}/trails/{trail_id}', 'verb': 'delete' });
    }).to.throw('ERROR [functionCalled = getParametersObject] : Could not find a parameterObject for uri: /areas/{area_idd}/trails/{trail_id} verb: delete error: Cannot read property \'delete\' of undefined');
  });

  it('Should throw the right error when supplying a verb that doesn\'t exist', function () {
    expect(function () {
      hikingAPI.getParametersObject({ 'uri': '/areas/{area_id}/trails/{trail_id}', 'verb': 'ddelete' });
    }).to.throw('ERROR [functionCalled = getParametersObject] : Could not find a parameterObject for uri: /areas/{area_id}/trails/{trail_id} verb: ddelete error: Cannot read property \'parameters\' of undefined');
  });

  it('Should return undefined when trying to call getParametersObject on an API object that has a path with missing parameters', function () {
    const parametersObject = hikingAPI.getParametersObject({ 'uri': '/areas', 'verb': 'get' });
    return should.equal(parametersObject, undefined);
  });

  it('Should return the correct parameters object when a valid uri and verb are supplied', function () {
    const parametersObject = hikingAPI.getParametersObject({ 'uri': '/areas/{area_id}/trails/{trail_id}', 'verb': 'delete' });
    parametersObject.should.deep.equal(
      [
        {
          'name': 'area_id',
          'in': 'path',
          'type': 'string',
          'format': 'uuid',
          'required': true,
          'description': 'the unique uuid that identifies this area'
        },
        {
          'name': 'trail_id',
          'in': 'path',
          'type': 'number',
          'required': true,
          'description': 'the unique uuid that identifies the particular trail that is desired'
        }
      ]
    );
  });
});

describe('Regexify urls', function () {
  let hikingAPI;
  before(function preValidateAPI () {
    hikingAPI = new SwaggerBank.API('./test/mockYamls/hiking_guide/hiking_guide.yaml');
    return Promise.all([hikingAPI.validateAPI()]);
  });

  it('Should properly return a regexifed url for various different parameter types', function () {
    const pathUri = '/areas/{area_id}/trails/{trail_id}/rocks/{rock_id}/{full_info}';
    const parametersObject = hikingAPI.getParametersObject({ 'uri': pathUri, 'verb': 'get' });
    const regexifedUrl = urlManager.RegExifyURL(pathUri, parametersObject);
    return regexifedUrl.should.equal('/areas/\\w+/trails/\\d+/rocks/\\d+/\\w+$');
  });
});
