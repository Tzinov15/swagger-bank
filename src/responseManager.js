'use strict';


const Chance = require('chance');
const chance = new Chance();
const configOptions = require('../config/options.js');
const moment = require('moment');
const btoa = require('btoa');

const RANDOM_STRING_LENGTH = configOptions.randomStringLength;
const RANDOM_ARRAY_LENGTH = configOptions.randomArrayLength;
const MIN_NUM = configOptions.minNumber;
const MAX_NUM = configOptions.maxNumber;

function isSimpleType (type) {
  if (['number', 'string', 'integer', 'boolean'].indexOf(type) > -1) {
    return true;
  }
  else {
    return false;
  }
}

function populateTemplate (refTemplate) {
  const refContent = {};
  // for each property in our referenced object template...
  for (const property in refTemplate) {
    // generate a random property by passing in information about the property (type, format, possible enums, etc)
    const randomProperty = propertyGenerator(refTemplate[property].type, refTemplate[property].format, refTemplate[property].possibleEnum);
    // add to refContent which is essentially like a populated version of the template that was passed in
    refContent[property] = randomProperty;
  }

  return refContent;
}

/**
* @param {String} propertyType The type of the property for which we are randomly generating a value
* @param {String} formatType   The optional format of the property for which we are randomly generating a value
* @param {Array} possibleEnum   An optional enum which is an array of possible values
* @return {Anything} returns the randomly generated value that adheres to the passed in type and format
* TEMPLATE-POPULATING STEP
*/
function propertyGenerator (propertyType, formatType, possibleEnum) {
  switch (propertyType) {
    case 'string':
      return generateString(formatType, possibleEnum);
    case 'array':
      return createArray(formatType);
    case 'number':
      return generateNumber(formatType);
    case 'integer':
      return generateNumber(formatType);
    case 'boolean':
      return generateBoolean();
    case 'object':
      return populateTemplate(formatType);
    default:
      console.warn(`!! WARNING!! We have a property type that we cant handle: ${propertyType}`);
      return propertyType;
  }
}

function generateBoolean () {
  return (process.env.PROP_GEN === 'static') ? (configOptions['string-boolean']) : (chance.bool());
}

  /**
  * @param {String} formatType   The optional format of the number (float, int, int32, etc)
  * @return {Number} The randomly generated number that adheres to the optional format passed in
  * TEMPLATE-POPULATING STEP
  */
function generateNumber (formatType) {
  switch (formatType) {
    default:
      const randomNumber = chance.integer({ min: MIN_NUM, max: MAX_NUM });
      const staticNumber = configOptions['number-default'];
      return (process.env.PROP_GEN === 'static') ? (staticNumber) : (randomNumber);
  }
}
  /**
  * @param {String} formatType   The optional format of the string (data, email, uuid, etc)
  * @param {Array} possibleEnum   An optional enum which is an array of possible values
  * @return {String} The randomly generated string that adheres to the optional format passed in
  * TEMPLATE-POPULATING STEP
  */
function generateString (formatType, possibleEnum) {
  if ((possibleEnum != null) && (process.env.PROP_GEN === 'random')) {
    const randomArrayElement = possibleEnum[Math.floor(Math.random() * possibleEnum.length)];
    return randomArrayElement;
  }
  else {
    let randomProperty;
    let staticProperty;
    switch (formatType) {
      case 'uuid':
        randomProperty = chance.guid();
        staticProperty = configOptions['string-uuid'];
        break;
      case 'email':
        randomProperty = chance.email({ domain: 'example.com' });
        staticProperty = configOptions['string-email'];
        break;
      case 'date-time':
        randomProperty = moment().format();
        staticProperty = configOptions['string-date-time'];
        break;
      case 'date':
        randomProperty = moment().format('YYYY-MM-DD');
        staticProperty = configOptions['string-date'];
        break;
      case 'password':
        randomProperty = "password_" + chance.word({ length: 5 });
        staticProperty = configOptions['string-password'];
        break;
      case 'byte':
        // Generate a random word, then base64 encode it
        randomProperty = btoa(chance.word({ length: 5 }));
        staticProperty = configOptions['string-byte'];
        break;
      case 'binary':
        // Generate a random string containing only 1's and 0's in sets of 8, with anywhere between 1 and 4 sets of 8 (8-32 bits total)
        randomProperty = chance.string({pool: '01', length: 8*chance.integer({min: 1, max:4})})
        staticProperty = configOptions['string-binary'];
        break;
      case 'uri':
        randomProperty = chance.url();
        staticProperty = configOptions['string-uri'];
        break;
      case 'ipv4':
        randomProperty = chance.ip();
        staticProperty = configOptions['string-ipv4'];
        break;
      case 'hostname':
        randomProperty = chance.domain();
        staticProperty = configOptions['string-domain'];
        break;

      // when no format is specified (type is set to string without any additional format)
      case undefined:
        randomProperty = chance.word({ length: RANDOM_STRING_LENGTH });
        staticProperty = configOptions['string-default'];
        break;

      default :
        // if we have a definition for formatType, then we automatically return it regardless of the PROP_GEN value
        // We do this because we can't possibly support random generation of a formatType that is unknown
        // So, even if property generation is set to random, we statically populate the random property for unknown format types
        // so that the user can simultaneously use random generation for basic format types, and use their custom value for unknown format types
        if ((configOptions[formatType] !== null) && (configOptions[formatType] !== undefined)) {
          return configOptions[formatType];
        }
        // at this point we have no definition for formatType. Regardless if propertyGenerationSetting is random or static, we throw an error
        throw new Error(`ERROR: No value found for GenerationOptions[${formatType}]. Please specify a value for ${formatType} even if you wish to use random generation`);
    }

    return (process.env.PROP_GEN === 'static') ? (staticProperty) : (randomProperty);
  }
}

/**
* TEMPLATE-POPULATING STEP
* Because we are creating an array of objects, we know that our formatType variable has been 'hacked' to actually equal
* the name of the object template for which we need to create an array of instances. We retreive the template for this object
* by referencing our global hash
* @param {String} objectDefinitionTemplate   The
* @return {Array} An array of objects whos schema is defined in the definitions section of the spec under a key of formatType
*/
function createArray (arrayType) {
  // retrieve the template with which we will generate our random objects from
  const arrayOfType = [];

  if (arrayType === 'null') {
    return arrayOfType;
  }
  if (isSimpleType(arrayType)) {
    for (let i = 0; i < RANDOM_ARRAY_LENGTH; i++) {
      arrayOfType.push(propertyGenerator(arrayType));
    }
  }
  else {
    for (let i = 0; i < RANDOM_ARRAY_LENGTH; i++) {
      arrayOfType.push(populateTemplate(arrayType));
    }
  }
  return arrayOfType;
}

function constructCompleteResponse (options) {
  const finalResponse = {
    'uri': options.uri,
    'verb': options.method,
    'res': {
      'statusCode': options.statusCode,
      'responseHeaders': { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      'responseBody': JSON.stringify(options.populatedTemplate)
    }
  };

  return finalResponse;
}

module.exports.populateTemplate = populateTemplate;
module.exports.createArray = createArray;
module.exports.constructCompleteResponse = constructCompleteResponse;
