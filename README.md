# sails-deploy-azure

The official Microsoft Azure deployment strategy for Sails.js.

This deployment strategy for Sails deploys your app to Azure in minutes.

Trying to figure out how this works? Read some more background [here](https://github.com/balderdashy/sails/pull/2667#issuecomment-75474760);


## Installation

Make sure you have the latest version of SailsJS. As of May 2015, you need to pull it directly from GitHub (balderdashy/sails). In your sails app, run:

```js
npm install sails-deploy-azure --save-dev
```

And update your `.sailsrc` file to include:

```json
{
    "generators": {
        "modules": {}
    },
    "commands": {
        "deploy": {
            "module": "sails-deploy-azure"
        }
    }
}
```


## Usage

First make sure you have `sails-deploy` installed and set up, then install and set up this module.

After that, you can just run `sails deploy` and follow the instructions.


## Development

To fire this puppy up, open the Node REPL and run:

```js
require('./')({config: {}}, console.log)
```

To run the tests:

```bash
$ npm test
```



## License

MIT

&copy; Mike McNeil 2015
