/**
 * Module dependences
*/

var path = require('path');
var _ = require('lodash');
var util = require('util');
var child_process = require('child_process');
var fs = require('fs');
var Azure = require('machinepack-azure');
var Spinner = require('node-spinner');
var log = require('single-line-log').stdout;
var prompt = require('prompt');
var colors = require('colors');

module.exports = function sailsDeployAzure(inputs, cb) {

  // Get the package.json so we can display current Azur edeploy version
  var addonPackageJson = require(path.resolve(__dirname, 'package.json')),
      appPackageJson = require(path.resolve(process.cwd(), 'package.json'))
  // Display welcome message
  console.log('Microsoft Azure'.blue,'deploy v'+addonPackageJson.version+' starting...');
  try {

    // `inputs.config` is provided with the raw config that Sails core gathered by running `rc`.
    //
    // If `config` is missing or invalid, bail out w/ an error
    // (we just throw an error w/ a helpful message, since the  catch() below will take care of it)
    if (!_.isObject(inputs.config)) {
      return cb(new Error('Incomplete `config` provided to sails-deploy-azure! Expected `config` to exist and be an object.'));
    }

    var ifa = (inputs.config.azure) ? inputs.config.azure : null,
        sitenameCli = (ifa && ifa.sitename) ? ifa.sitename : appPackageJson.name,
        usernameCli = (ifa && ifa.username) ? ifa.username : null,
        passwordCli = (ifa && ifa.password) ? ifa.password : null;

    if (sitenameCli && usernameCli && passwordCli) {
      // All three parameters given, assume that website already exists
      deployToSite(sitenameCli, usernameCli, passwordCli, cb);
    } else if (sitenameCli) {
      // Only sitename given, check if it exists
      createSite(sitenameCli, function(err, result) {
        if (err) {return cb(err);}
        deployToSite(sitenameCli, usernameCli, passwordCli, cb);
      });
    } else {
      // Something went wrong
      return cb(new Error('Deployment failed for unknown reason.'));
    }

    function createSite(sitename, callback) {
      Azure.checkActiveSubscription().exec({
        error: function (err){
          return cb(new Error(require('util').format('Error checking for active subscription: %s', err)));
        },
        success: function (isActive){
          (function (next){
            if (isActive) {
              return next();
            }

            Azure.registerAzureAccount({}, {
              error: function (err) {next(err);},
              success: function (result) {
                next();
              }
            });
          })(function afterwards(err){
            if (err) {
              return cb(new Error(require('util').format('Error registering Azure account: %s', err)));
            }

            var createOptions = sitename ? {name: sitename} : {};

            Azure.existsWebsite(createOptions).exec({
              error: function (err) {
                return cb(new Error(require('util').format('Error creating Website: %s', err)));
              },
              success: function (result) {
                if (result) {
                  console.log('Website already exists in account, moving on...');

                  var credentialsLink = 'https://manage.windowsazure.com/#Workspaces/WebsiteExtension/Website/' + sitename + '/dashboard';
                      credentialsLink = credentialsLink.underline.green;

                  console.log('You need to use deployment credentials. For security reasons, this step is manual.\n If not known, open ' + credentialsLink + ' and click "Set Deployment Credentials".'.red);
                  prompt.start();

                  prompt.get({
                    properties: {
                      username: {
                        description: "What is the deployment username?"
                      },
                      password: {
                        hidden: true,
                        description: "What is the deployment password?"
                      }
                    }
                  }, function (err, userInput) {
                    if (err) {
                      return cb(new Error(require('util').format('Error prompting for deployment credentials: %s', err)));
                    }

                    usernameCli = userInput.username;
                    passwordCli = userInput.password;

                    return callback();
                  });
                } else {
                  console.log('Website does not exist in account, trying to create...');
                  Azure.createWebsite(createOptions).exec({
                    error: function (err) {
                      return callback(require('util').format('Error creating Website: %s', err));
                    },
                    success: function () {
                      var credentialsLink = 'https://manage.windowsazure.com/#Workspaces/WebsiteExtension/Website/' + sitename + '/dashboard';
                      credentialsLink = credentialsLink.underline.green;

                      console.log('Website ' + sitename + ' created.');
                      console.log('You need to use deployment credentials. For security reasons, this step is manual.\n If not known, open ' + credentialsLink + ' and click "Set Deployment Credentials".'.red);
                      prompt.start();

                      prompt.get({
                        properties: {
                          username: {
                            description: "What is the deployment username?"
                          },
                          password: {
                            hidden: true,
                            description: "What is the deployment password?"
                          }
                        }
                      }, function (err, userInput) {
                        if (err) {
                          return cb(new Error(require('util').format('Error prompting for deployment credentials: %s', err)));
                        }

                        usernameCli = userInput.username;
                        passwordCli = userInput.password;

                        return callback();
                      });
                    }
                  });
                }
              }
            });
          });
        }
      });
    }

    function deployToSite(sitename, username, password, callback) {
      sitename = sitename || sitenameCli;
      username = username || usernameCli;
      password = password || passwordCli;

      var jobOptions = {
        deploymentUser: username,
        deploymentPassword: password,
        name: 'sailsdeploy.ps1',
        website: sitename
      };

      console.log('Starting Deployment');

      // (1) Create ZIP package -----------------------------------------------------------
      zipSailsApp({}, {
        error: function (err) {
          return callback(new Error(require('util').format('Creating ZIP package failed: %s', err)));
        },
        success: function () {
          console.log('ZIP package created.');
      // (2) Upload File ------------------------------------------------------------------
          Azure.uploadFile({
            deploymentUser: username,
            deploymentPassword: password,
            fileLocation: getPathToDeploymentArchive(),
            remotePath: 'site/temp/deployment.zip',
            website: sitename
          }).exec({
            error: function (err) {
              return callback(new Error(require('util').format('Uploading file failed: %s', err)));
            },
            success: function () {
              console.log('Deployment package uploaded');
      // (3) Upload Webjob ----------------------------------------------------------------
              Azure.uploadWebjob({
                deploymentUser: username,
                deploymentPassword: password,
                fileLocation: path.resolve(__dirname, './payload/sailsdeploy.ps1'),
                website: sitename
              }).exec({
                error: function (err) {
                  return callback(new Error(require('util').format('Uploading webjob failed: %s', err)));
                },
                success: function (result) {
                  console.log('Deployment script uploaded');
      // (4) Trigger Webjob ---------------------------------------------------------------
                  Azure.triggerWebjob(jobOptions).exec({
                    error: function (err) {
                      return callback(new Error(require('util').format('Triggering webjob failed: %s', err)));
                    },
                    success: function () {
                      console.log('Deployment script started');
      // (5) Get Latest Webjob Log --------------------------------------------------------
                      var scriptDone = false;
                      var spinner = Spinner();
                      var retryCounter = 0;

                      var spinnerInterval = setInterval(function(){
                          process.stdout.write('\r \033[36mcomputing\033[m ' + spinner.next());
                      }, 250);

                      var getLog = function () {
                        Azure.logWebjob(jobOptions).exec({
                          error: function (err) {
                            // Retry 5 times before we fail
                            if (retryCounter <= 5) {
                              retryCounter = retryCounter + 1;
                              setTimeout(getLog, 800);
                            } else {
                              return callback(new Error('Failed to fetch script status'));
                            }
                          },
                          success: function (scriptOutput) {
                            if (scriptOutput.body && scriptOutput.body.indexOf('All done!') > -1) {
                              console.log('Deployment finished.')
                              console.log('The site should be available at ' + sitename + '.azurewebsites.net.');
                              clearInterval(spinnerInterval);
                              return cb();
                            } else {
                              if (scriptOutput.body) {
                                log(scriptOutput.body);
                                process.stdout.write('\r \033[36mcomputing\033[m ' + spinner.next());
                              }
                              setTimeout(getLog, 400);
                            }
                          }
                        });
                      };

                      getLog();
                    }
                  });
                }
              });
            }
          });
        }
      });
    }


  }
  catch (e) {
    console.error('Deployment to Azure failed! Details:\n',e.stack);
    return cb(e);
  }
};

/* Helper Methods */

/**
 * ```
 * getDeploymentArchiveStream().pipe(outs);
 * ```
 *
 * @return {Readable} get the read stream pointing at the deployment.zip file.
 */
function getDeploymentArchiveStream() {
  var fs = require('fs');
  return fs.createReadStream(getPathToDeploymentArchive());
}

/**
 * @return {String} the absolute path where the .zip deployment archive should live
 */
function getPathToDeploymentArchive(options) {
  var path = require('path');

  options = options || {
    appPath: process.cwd()
  };

  // TODO: load app config and use configured tmp directory
  var tmpDir = path.resolve(options.appPath, '.tmp/');
  // TODO: configurable filename for archive, or use uuid
  var archiveFilename = 'deployment.zip';
  var archiveAbsPath = path.resolve(tmpDir, archiveFilename);

  return archiveAbsPath;
}

/**
 * WARNING: unfinished
 * @param  {[type]} inputs [description]
 * @param  {[type]} exits  [description]
 * @return {[type]}        [description]
 */
function zipSailsApp(inputs, exits) {

  var Zip = require('machinepack-zip');
  var path = require('path');

  var appPath = path.resolve(process.cwd(), inputs.dir || './');

  // TODO ensure output folder exists
  // TODO ensure src folders exist??

  // Zip up the specified source files or directories and write a .zip file to disk.
  Zip.zip({
    // TODO: get all the things, not just the conventional things
    sources: [
      // Inject Azure Node Config
      path.resolve(__dirname, './payload/iisnode.yml'),
      path.resolve(__dirname, './payload/web.config'),
      // Other Stuff
      path.resolve(appPath, 'README.md'),
      path.resolve(appPath, 'app.js'),
      path.resolve(appPath, '.sailsrc'),
      path.resolve(appPath, 'tasks'),
      path.resolve(appPath, 'package.json'),
      path.resolve(appPath, 'assets'),
      path.resolve(appPath, 'views'),
      path.resolve(appPath, 'config'),
      path.resolve(appPath, 'api')
    ],
    destination: getPathToDeploymentArchive(),
  }).exec({
    // An unexpected error occurred.
    error: exits.error,
    // OK.
    success: function () {
      return exits.success();
    }
  });
}
