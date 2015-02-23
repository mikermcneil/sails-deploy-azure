/**
 * Module dependences
*/

var path = require('path');
var _ = require('lodash');




module.exports = function sailsDeployAzure(inputs, cb) {

  // `inputs.config` is provided with the raw config that Sails core gathered by running `rc`.

  try {

    // If `config` is missing or invalid, bail out w/ an error
    // (we just throw an error w/ a helpful message, since the  catch() below will take care of it)
    if (!_.isObject(inputs.config)) {
      throw new Error('Incomplete `config` provided to sails-deploy-azure! Expected `config` to exist and be an object.');
    }

    // TODO: deploy the app and stuff

    return cb();

  }
  catch (e) {
    console.error('Deployment to Azure failed! Details:\n',e.stack);
    return cb(e);
  }
};
