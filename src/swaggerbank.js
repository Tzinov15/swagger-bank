'use strict';
// TODO: Provide an API through which a user can set values for configuration (max random string length, random responses or one response, # of items per array, etc)
// TODO: Allow user to be able to specify values for not just a property type (via config through configuring static values in config), but also for property names

const _ = require('lodash');
const colors = require('colors');
const SwaggerParser = require('swagger-parser');
const mountebankHelper = require('mountebank-helper');

const urlManager = require('./urlManager');
const responseManager = require('./responseManager');

/**
 * Helper function that should probably be put into a separate file. Pretty self explanatory behavior
 * @method isSimpleType
 * @param  {String}     type A string describing the type of what we're checking
 * @return {Boolean}    True if the type is a simple type, false otherwise
 */
function isSimpleType (type) {
  if (['number', 'string', 'integer', 'boolean'].indexOf(type) > -1) {
    return true;
  }
  else {
    return false;
  }
}

class API {

  /**
  * @param  {String} specPath  The file path of the swagger spec that will be used
  * @return {Object }         Returns an instance of the API class
  */
  constructor (specPath) {
    if (!_.isString(specPath)) {
      throw new TypeError('specPath must be a string');
    }
    this.specPath = specPath;
    this.apiObject = null;
    this.responses = [];
    this.objectTemplateHash = {};
    this.parser = new SwaggerParser();
    this.propertyGenerationSetting = process.env.PROP_GEN;
  }

  /**
  * This will be the first method that is called for any manipulations / transformations / imposter-generation to/from the swagger spec file
  * This will call swagger-parsers validate method which will ensure that the swagger spec is properly formatted according to the Swagger Spec
  * If it is properly formatted, validateAPI() will return a promise resolving to the spec file with:
  *  - external references resolved, meaning that multiple swagger files will be resolved into one
  *  - internal references NOT resolved, meaning that any references will keep their references instead of being expanded everywhere
  *  * If the swagger file does NOT pass the validation, an error will be thrown
  * @return {Object }         Returns an instance of the API class
  */
  validateAPI () {
    return this.parser.validate(this.specPath, {
      $refs: {
        internal: false,
        circular: false
      }
    })
    .then(validatedAPI => {
      this.apiObject = validatedAPI;
      return validatedAPI;
    })
    .catch(error => {
      if (error.message.indexOf('ENOENT: no such file') !== -1) {
        throw (error.message);
      }
      else {
        throw (error.message);
      }
    });
  }

  /**
  * This will return the original definitions section of the swagger spec (no transformations)
  * Here 'this' corresponds to the instance of the swagger-parser class that will reuse throughout (initialized when calling the constructor for API)
  * Once validate is called (called in validateAPI() ), this instance becomes populated with useful data we can reuse (such as the .api object that we reference below)
  * The apiObject (which is a derivation of the original swagger spec) is required to have the 'definitions' field which is why that is hardcoded here
  * @return {Object}   Returns an object where the keys are the referenced object names and the values are respective schema bodies
  */
  getAllObjectDefinitions () {
    if (this.apiObject.definitions == null) {
      throw new Error('Please provide any object references inside a \'definitions\' section inside your swagger spec');
    }
    return this.apiObject.definitions;
  }

  /**
  * This will return the original responses section of the swagger spec (no transformations)
  * Here this corresponds to the instance of the swagger-parser class that will reuse throughout (initialized when calling the constructor for API)
  * Once validate is called (called in validateAPI() ), this instance becomes populated with useful data we can reuse (such as the .api object that we reference below)
  * The apiObject (which is a derivation of the original swagger spec) is required to have the 'definitions' field which is why that is hardcoded here
  * @return {Object}   Returns an object where the keys are the referenced object names and the values are respective schema bodies
  */
  getAllResponses () {
    if (this.apiObject.responses == null) {
      return null;
    }
    return this.apiObject.responses;
  }

  /**
  * This will take in essentially a key-value pair taken from the definitions section.
  * The method will return a 'template' that will contain all of the necessary information needed to reconstruct a valid response that adheres to the schema
  * We store these templates in this hash so that we can reuse the template whenever the respective object reference is referenced throughout the swagger spec
  * @param {Object}  refSchema This is a reference object schema that is extracted from the definitions or responses sections of the swagger spec. Represents a single object defined in the spec
  * @param {String}  refName This is the reference object name (key) pertaining the reference object schema (value) found in the definitions section of the spec
  * @return {Object}   Returns an object where the keys are the referenced/defined object and the values are respective schemas
  * TODO: Should not be re-parsing and reprinting the same object definition if it has already been encountered
  * TODO: Add error handling / try-catch loops here
  */
  constructTemplateForRef (refSchema, refName) {
    if (!_.isString(refName)) {
      throw new TypeError('refName must be a string');
    }
    if (!_.isObject(refSchema)) {
      throw new TypeError('refSchema must be an object');
    }

    // This is the template which will hold the metadata needed to reconstruct this particular object definition
    const refTemplate = { };

    if (refSchema.type === 'array') {
      // ARRAY OF NATIVE OBJECTS
      if (refSchema.items.type === 'object') {
        const objectTemplate = this.constructTemplateForRef(refSchema.items, refName);
        refTemplate[refName] = { 'type': 'array', 'format': objectTemplate };
        return refTemplate;
      }

      // ARRAY OF NATIVE SIMPLE TYPES
      else if (isSimpleType(refSchema.items.type)) {
        refTemplate[refName] = { 'type': 'array', 'format': refSchema.items.type };
        return refTemplate;
      }

      // ARRAY OF OBJECT REFERENCES
      else if (refSchema.items.$ref !== undefined) {
        // Extract object name from $ref tag
        const objectName = refSchema.items.$ref.replace('#/definitions/', '');
        // Use object name to hash into definitions object and extract schema for this object
        const objectSchema = this.apiObject.definitions[objectName];
        if (objectSchema === undefined) {
          console.error('Your object schema is undefined. This most likely means you are referencing an object that doesn\'t have a definition');
          process.exit(-1);
        }
        // Construct our template recursively for the object that is defined at the $ref tag location
        const objectTemplate = this.constructTemplateForRef(objectSchema, objectName);
        refTemplate[refName] = { 'type': 'array', 'format': objectTemplate };
      }
    }

    // NATIVE SIMPLE TYPE
    else if (isSimpleType(refSchema.type)) {
      refTemplate[refName] = { 'type': refSchema.type, 'format': refSchema.formatType };
      return refTemplate;
    }

    // NATIVE OBJECT, recursing through each property of this object
    // For each property in our referenced object definition...
    for (const property in refSchema.properties) {
      const propertyInfo = refSchema.properties[property];

      // Get the type of this property. If this property is defined else and only a $ref tag exists, this type should be null
      const propertyType = propertyInfo.type;

      // many properties may not contain this format field, but we will extract anything that might be in it for finer generation of random data (email, uuid, etc)
      const formatType = propertyInfo.format;

      // PROPERTY IS DEFINED IN-PLACE
      if (propertyInfo.$ref === undefined) {
        // PROPERTY IS AN ARRAY
        if (propertyType === 'array') {
          // ARRAY OF OBJECTS
          if (propertyInfo.items.type === 'object') {
            const objectTemplate = this.constructTemplateForRef(propertyInfo.items, property);
            refTemplate[property] = { 'type': 'array', 'format': objectTemplate };
          }

          // ARRAY OF SIMPLES (string, boolean, number, integer, etc)
          else if (isSimpleType(propertyInfo.items.type)) {
            refTemplate[property] = { 'type': 'array', 'format': propertyInfo.items.type };
          }

          // ARRAY OF OBJECTS DEFINED VIA $REF
          else if (propertyInfo.items.$ref !== undefined) {
            // Extract object name from $ref tag
            const objectName = propertyInfo.items.$ref.replace('#/definitions/', '');

            // Use object name to hash into definitions object and extract schema for this object
            const objectSchema = this.apiObject.definitions[objectName];
            if (objectSchema === undefined) {
              console.error('Your object schema is undefined. This most likely means you are referencing an object that doesn\'t have a definition');
              process.exit(-1);
            }
            // Construct our template recursively for the object that is defined at the $ref tag location
            const objectTemplate = this.constructTemplateForRef(objectSchema, objectName);
            refTemplate[property] = { 'type': 'array', 'format': objectTemplate };
          }

          // ARRAY OF NOTHING
          else if ((propertyInfo.items === null) || (propertyInfo.items === '') || (propertyInfo.items === undefined) || (JSON.stringify(propertyInfo.items, null, 2) === '{}')) {
            console.warn(colors.yellow(`WARNING:  Encountered an array without a type for its items. Generating an empty array instead for ${property}`));
            refTemplate[property] = { 'type': 'array', 'format': 'null' };
          }

          // SOMETHING BAD
          else {
            throw new Error(colors.red(`PARSE ERROR: You most likely defined an array of different types of objects. Don\'t do that. Here\'s the faulty spec: ${JSON.stringify(propertyInfo, null, 2)}`));
          }
        }

        // PROPERTY IS AN IN-PLACE OBJECT
        else if (propertyType === 'object') {
          // Construct our template recursively for the object that is defined in place, passing in the schema defined
          const objectTemplate = this.constructTemplateForRef(propertyInfo, property);
          refTemplate[property] = { 'type': 'object', 'format': objectTemplate };
        }

        // PROPERTY IS A IN-PLACE SIMPLE TYPE
        else if (isSimpleType(propertyType)) {
          refTemplate[property] = { 'type': propertyType, 'format': formatType };
        }
      }

      // PROPERTY IS DEFINED ELSEWHERE VIA $REF TAG
      else {
        // Extract object name from $ref tag
        const objectName = propertyInfo.$ref.replace('#/definitions/', '');

        // Use object name to hash into definitions object and extract schema for this object
        const objectSchema = this.apiObject.definitions[objectName];
        if (objectSchema === undefined) {
          console.error('Your object schema is undefined. This most likely means you are referencing an object that doesn\'t have a definition');
          process.exit(-1);
        }
        // Construct our template recursively for the object that is defined at the $ref tag location
        const objectTemplate = this.constructTemplateForRef(objectSchema, objectName);
        refTemplate[property] = { 'type': 'object', 'format': objectTemplate };
      }
    }
    return refTemplate;
  }

  /**
  * Takes in our object of definitions directly extracted from our swagger spec and returns a new 'tempateHash' which is similar to the definitions object passed in.
  * Our internal templateHash contains concise and easy-to-access data for reconstructing all of the schemas
  * @param {Object}  definitions   This is the definitions section of the swagger spec that is directly extracted by calling getAllObjectDefinitions()
  * @return {Object}  Returns the complete hash containing all of our templates (where each template contains the necessary information to reconstruct that schema with actual data)
  */
  constructAllRefs (definitions) {
    for (const ref in definitions) {
      const refTemplate = this.constructTemplateForRef(definitions[ref], ref);
      this.objectTemplateHash[ref] = refTemplate;
    }
    return this.objectTemplateHash;
  }

  /**
   * @returns {String} The base path defined for this route. Defaults to '/' if one isn't defined for the spec
   */
  getApiBasePath () {
    if (this.apiObject.basePath == null) {
      return '/';
    }
    return this.apiObject.basePath;
  }

  /**
   * @returns {String} The global producesType defined for this spec. Defaults to 'application/json' if one isn't defined for the spec
   */
  getApiProducesType () {
    if (this.apiObject.produces == null) {
      return 'application/json';
    }
    return this.apiObject.produces;
  }

  /**
  * Given a uri and verb (wrapped within a uriVerbObject), this method will extract the entire Swagger Parameters Object pertaining to that path
  * @param  {object} uriVerbObject The uri and verb wrapped within an object
  * @return {Array/Object}               The swagger Parameters Object
  */
  getParametersObject (uriVerbObject) {
    const uri = uriVerbObject.uri;
    const verb = uriVerbObject.verb;
    let parameterObject;
    try {
      parameterObject = this.apiObject.paths[uri][verb].parameters;
    }
    catch (e) {
      // A TypeError will be thrown if the uri supplied doesn't exist in our swagger-like state
      if (e instanceof TypeError) {
        throw new TypeError(`ERROR [functionCalled = getParametersObject] : Could not find a parameterObject for uri: ${uri} verb: ${verb} error: ${e.message}`);
      }
      else {
        throw new Error(`ERROR [functionCalled = getParametersObject] : ${e.message} `);
      }
    }
    return parameterObject;
  }

  /**
   * @returns {Array} Returns a list of response objects that can be directly plugged into mountebank-helpers addRoute method
   */
  getAllResponsesForApi () {
    // directly extract the definitions section of the swagger spec
    const apiDefinitions = this.getAllObjectDefinitions();

    // directly extract the global responses  section of the swagger spec
    const apiResponses = this.getAllResponses();

    // convert the definitions section into an easy to use definition template hash
    const definitionsTemplateHash = this.constructAllRefs(apiDefinitions);

    // this will be the array of mountebank-helper.addRoute() friendly responses that will be returned
    const arrayOfCompleteResponses = [];

    // this paths object contains all the information about our apis API routes, parameters, response schemas, examples, etc
    const paths = this.apiObject.paths;

    // get the produces type (needed later to extract example from response object)
    const producesType = this.getApiProducesType();

    // for each of the possible routes the API provides (URIs)...
    for (const route in paths) {
      // for each of the possible methods on this route that the API provides....
      for (const verb in paths[route]) {
        // for each of the possible responses that can be returned from this path (uri + verb)...
        for (const status in paths[route][verb].responses) {
          const routeParametersObject = this.getParametersObject({ 'uri': route, 'verb': verb });

          const newUrl = this.getApiBasePath() + urlManager.RegExifyURL(route, routeParametersObject);
          // console.log(colors.cyan('newUrl: ') + colors.green(newUrl));
          const method = verb.toUpperCase();
          // ensure that our status is a Javascript number
          const statusCode = Number(status);

          // If we have a response defined for error codes (anything other than 200 or 201) we will
          // NOT include them in our Imposter due to mountebanks round-robin style of returning multiple
          // responses for a single path
          if ((statusCode !== 200) && (statusCode !== 201) && (statusCode !== 'default')) continue;

          let responseObject = paths[route][verb].responses[statusCode];

          // If our response object is actually just a reference to a reference object that is defined globally...
          if (responseObject.$ref !== undefined) {
            const referencedResponseName = responseObject.$ref.replace('#/responses/', '');
            // Extract it from there
            responseObject = apiResponses[referencedResponseName];
          }

          const responseSchema = responseObject.schema;
          // if the response doesn't define any kind of schema, we assume it is a empty response and we continue
          if ((responseSchema === undefined) || (responseSchema === null)) {
            continue;
          }

          // EXAMPLE MODE
          if (process.env.PROP_GEN === 'example') {
            if (responseObject.examples == null) {
              throw new Error(`ERROR: process.env.PROP_GEN was set to example but the response for ${route} ${verb} ${statusCode} did NOT contain an examples section`);
            }
            // extract our example for this response (already in JSON!)
            const responseExample = responseObject.examples[producesType];
            const completeResponse = responseManager.constructCompleteResponse({ 'uri': newUrl, 'method': method, 'statusCode': statusCode, 'populatedTemplate': responseExample });
            arrayOfCompleteResponses.push(completeResponse);
          }

          // STATIC OR RANDOM MODE - This gets handled inside of responseManager
          else {
            let referencedTemplate;
            if (responseSchema.$ref === undefined) {
              // console.warn(colors.yellow('WARNING:  This response object has no $ref tag. The response schema must be defined in place... This is not recommended...'));
              referencedTemplate = this.constructTemplateForRef(responseSchema, 'property');
            }
            else {
              // Otherwise we have a reference object that is defined elsewhere and we need to retrieve it
              const referencedTemplateName = responseSchema.$ref.replace('#/definitions/', '');
              // TODO: Add check here in case referencedTemplateName is still undefined, this indicates that the referenced object doesn't have an existing definition
              referencedTemplate = definitionsTemplateHash[referencedTemplateName];
            }
            let populatedTemplate = responseManager.populateTemplate(referencedTemplate);
            if (populatedTemplate.property !== undefined)  populatedTemplate = populatedTemplate.property;
            const completeResponse = responseManager.constructCompleteResponse({ 'uri': newUrl, 'method': method, 'statusCode': statusCode, 'populatedTemplate': populatedTemplate });
            arrayOfCompleteResponses.push(completeResponse);
          }
        }
      }
    }
    return arrayOfCompleteResponses;
  }

  /**
   *
   */
  setupMountebankImposter (imposterPortNumber) {
    const Imposter = new mountebankHelper.Imposter({ 'imposterPort': imposterPortNumber });
    console.log(`[SWAGGER-BANK] Using ${((process.env.PROP_GEN === undefined) ? ('random') : (process.env.PROP_GEN)).toUpperCase()} property generation when creating response`);
    const allResponses = this.getAllResponsesForApi();
    allResponses.forEach(function (element) {
      Imposter.addRoute(element);
    });
    return mountebankHelper.startMbServer(2525)
    .then(() => {
      return Imposter.postToMountebank()
      .then((responseBody) => {
        console.log(`[SWAGGER-BANK] SUCCESS: Your Imposter is now listening!! Use localhost:${imposterPortNumber}${this.getApiBasePath()} to start testing your swagger routes`);
        return responseBody;
      })
      .catch(error => {
        console.log('Error from postToMountebank: ');
        console.log(error);
      });
    });
  }
}
module.exports = API;
