[![js-semistandard-style](https://cdn.rawgit.com/flet/semistandard/master/badge.svg)](https://github.com/Flet/semistandard)<br>
[![Build Status](https://travis-ci.org/Tzinov15/SwaggerBank.svg?branch=master)](https://travis-ci.org/Tzinov15/SwaggerBank)
[![Coverage Status](https://coveralls.io/repos/github/Tzinov15/SwaggerBank/badge.svg?branch=master&bustagain=4)](https://coveralls.io/github/Tzinov15/SwaggerBank?branch=master&bustagain=5)

<img src="./swaggerbanklogo.png" alt="alt text" width="300" height="230">

A library to bridge **[Swagger API specifications](http://swagger.io/)** and the **[Mountebank](http://www.mbtest.org/)** Response Stubbing Tool. Pass in your API's Swagger spec file and get a full-blown mocked out version of your API to test against.


# Install

```bash
npm install swaggerbank
```

<h1> Usage </h1>

```javascript

const SwaggerBank = require('swaggerbank');
const api = new SwaggerBank.API('./demoApi.yaml');

api.validateAPI()
.then( () => {
	api.setupMountebankImposter(3000);
})

```

To see this in action right now:    
`git clone https://github.com/Tzinov15/SwaggerBank.git`   
`cd SwaggerBank`    
`npm install`   
`node demo/full.demo.js` from the root of the project.    
Now navigate to [`localhost:3000/v1/areas`](http://localhost:3000/v1/areas) to see a mocked route in action! This mocked API is
based on the `demoApi.yaml` Swagger Spec. Explore the spec and play around with the mocked responses. Whenever you're ready, swap in your own spec!

## Mocked Property Generation
SwaggerBank allows you to set how you want your mocked API to behave. You have three choices (configurable through setting `PROP_GEN`) Try these out with the `node demo/full.demo.js` example above.           <br><br>

### Random
<b>PROP_GEN=random:</b> randomly generated data (that adheres to the defined schema) will be used as the mocked response. For example, if you have a property with `type: string` and `format: uuid`, then a random valid uuid will be generated for that property when it gets returned as part of a mocked response. To set custom format types for strings and ints, add them to `config/options.js` <br>

### Static
<b>PROP_GEN=static:</b> static data pulled from ````config/options.js```` (that adheres to the defined schema) will be used as the mocked response. See repo for how ```config/options.js``` should be configured<br>

### Example
<b>PROP_GEN=example:</b> The example specified in your spec under that response will be directly used as the mocked response. **Important** For this feature to work, **ALL** of your routes must have an example section<br>

Another feature that is coming soon is the ability to hardcode a particular value for a given property name. Ex: If in your spec there is a property called `remoteIp` that appears in several responses which you **know** will always have the same value whenever the **real** server gets hit, then you can set the hardcoded value for this property. This will allow for setting up a mocked API that more closely reflects what the real API will do




<h1> Incomplete Features / Bugs / TODOS </h1>

See [Known Issues](./KnownIssues.md)
