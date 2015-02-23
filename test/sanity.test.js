/**
 * Module dependencies
 */

var sailsDeploy = require('../');





describe('normal usage: sanity check', function (){

  before(function setup(done){
    done();
  });



  it('should not do anything insane', function (done){
    sailsDeploy({config: {}}, function (err){
      // we might get an `err`, that's ok
      // this test just makes sure nothing crashes
      done();
    });
  });



  after(function teardown(done){
    done();
  });

});
