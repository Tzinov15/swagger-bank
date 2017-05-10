'use strict';

/**
 * Get the type and format information for each url parameter that we have extracted from a given url
 * Because Swagger enforces a strict rule where any defined url parameters MUST have a respective definition in the Parameters object,
 * we don't need to separately extract the URL parameters from the uri but can instead safely assume that they will ALL be listed in the Parameters object
 * @param {Array} paramObject    The swagger Parameters object for our given route. This object contains type/format information on our url params
 * @return {Array}  Returns an object where the key is the name of the url parameter and the key is an sub-object contain type and format information
 */
function getUrlParamTypes (paramObject) {
  const paramNameparamMetadataHash = {};
  // for each parameter declared in our swagger Parameters object...
  for (const parameter in paramObject) {
    // if it's a path parameter, add it to our url parameter template hash info thing
    if (paramObject[parameter].in === 'path') {
      paramNameparamMetadataHash[paramObject[parameter].name] = { 'type': paramObject[parameter].type, 'format': paramObject[parameter].format };
    }
  }
  return paramNameparamMetadataHash;
}

/**
 * Returns a regex expression that will match the type of property specified in paramType
 * @param  {String} paramType The property type of the url parameter for which we are constructing a regex
 * @return {String}            A regex that is to be injected in place of url parameters so that the route will be matched by mountebank
 */
function constructRegExFor (paramType) {
  switch (paramType) {
    case 'string':
      return '\\w+';
    case 'number':
      return '\\d+';
    case 'integer':
      return '\\d+';
    default:
      return '\\w+';
  }
}

/**
 * Takes in a uri with url parameters and the respective param_template object which contains information on the param type/format and creates a
 * regex representation of that uri that will match whenever a validly formatted uri + params is provided
 * @param {Array} paramTemplate    The swagger Parameters object for our given route. This object contains type/format information on our url params
 * @param {String}  url The url whose url parameters we are replacing with regex sections
 * @return {Array}  Returns our uri where each of the url parameters is replaced with the respective regex needed to match it
 */
function injectRegExIntoUrl (paramTemplate, url) {
  let newUrl = url;
  for (const param in paramTemplate) {
    const paramRegex = constructRegExFor(paramTemplate[param].type);
    const paramSlot = `{${param}}`;
    newUrl = newUrl.replace(paramSlot, paramRegex);
  }
  // ensure that our regex ends in a dollar sign to prevent from weird matching
  // behavior when separate routes have same root route
  newUrl += '$';
  return newUrl;
}

/**
 * Takes in a url (with url parameter slots ex: {area_id}) and a swagger Parameters object and replaces each parameter slot with the correct RegEx
 * that adheres to url parameter type defined in the Parameters object for that respective parameter
 * @param {String} uri                   The original url that we are regexifing
 * @param {Object/Array} swaggerParametersObject The swagger Parameters object that contains information on the type/format of the url parameter
 * @return {String}   The regexifed url where each url parameter slot is replaced with the respective regex
 */
function RegExifyURL (uri, swaggerParametersObject) {
  const urlParamTemplate = getUrlParamTypes(swaggerParametersObject);
  const completeUri = injectRegExIntoUrl(urlParamTemplate, uri);
  return completeUri;
}

module.exports.RegExifyURL = RegExifyURL;
