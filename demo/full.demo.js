const SwaggerBank = require('../src/index');
const api = new SwaggerBank.API('./demo/demoApi.yaml');

api.validateAPI()
.then( () => {
  api.setupMountebankImposter(3000);
})
.catch(error => {
  console.log(error);
})
