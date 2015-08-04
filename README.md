# sails-deploy-azure
The official Microsoft Azure deployment strategy for Sails.js. This deployment strategy for Sails deploys your app to Azure in minutes.

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
To try this out, you'll need Node.js and NPM installed on your local machine. To try the actual deployment, you can either go the brave path of also setting up a SailsJS app or use a provided test app (http://1drv.ms/1A7r3hS). If you want to go with a provided test app, skip to step 5.

1) Install the latest version of Sails by running the following command. At the time of writing this tutorial, commit 8747a77273c949455a8a89d79abfd36383d10e73 was used.

```
npm install -g balderdashy/sails
```

2) Create a new folder for your brand new SailsJS app and open up PowerShell/Terminal in said folder. Run the following command to scaffold the app:

```
sails new .
```

3) Update the configuration to use the correct port by opening up config/env/production.js and updating it to look like this:

```
module.exports = {
    port: process.env.port,
};
```
4) It's a good idea to disable Grunt for your website - it's extremely useful while in development mode, but shouldn't be part of a deployment. This step is not specific to Azure, but a good asset management practice for SailsJS. Open up package.json and remove everything that begins with "grunt-" except for Grunt itself.

5) Log into the Azure Portal and create a new web app. Ideally, the website should have some power to run the Sails installation process without trouble. To ensure enough resources, create the website either in a "Basic" or a "Standard" plan. Make also sure to set deployment credentials for your website.

6) Go back to your Sails app and create a file called ".sailsrc" in its root folder. Fill it with the following JSON. Make sure to set the sitename, deployment username, and deployment password to the right setting.

```
{
    "commands": {
        "deploy": {
        "module": "sails-deploy-azure"
    }
},
"azure": {
    "sitename": "YOUR_SITENAME",
    "username": "YOUR_USER",
    "password": "YOUR_PASSWORD"
    }
}
```

 You are ready for deployment! Run the following command from your app's root folder to let your local Sails app deploy to Azure:

```
node ./node_modules/sails/bin/sails.js deploy
```

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
