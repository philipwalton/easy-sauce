# Easy Sauce

[![Build Status](https://secure.travis-ci.org/philipwalton/easy-sauce.png)](http://travis-ci.org/philipwalton/easy-sauce)

Easy Sauce is a Node.js library that makes it easy to run JavaScript unit tests on the Sauce Labs cloud.

* [Installation](#installation)
* [Usage](#usage)
  * [Command Line Interface](#command-line-interface)
  * [Node.js API](#nodejs-api)
* [Running the tests](#running-the-tests)

For a detailed explanation of how automated, cross-browser JavaScript unit testing works, and the motivation behind Easy Sauce, see the article [Learning How to Set Up Automated, Cross-browser JavaScript Unit Testing](https://philipwalton.com/articles/learning-how-to-set-up-automated-cross-browser-javascript-unit-testing/).

## Installation

Easy Sauce can be installed from npm by running the following command:

```sh
npm install easy-sauce
```

**Note:** running `easy-sauce` requires at least Node.js version 6 (due to its use of es2015 code).

## Usage

Easy Sauce comes with a command line interface (CLI) as well as a programatic API for use within Node.js.

### Command Line Interface

The `easy-sauce` command can be used as follows:

```
Usage: easy-sauce [options]

The easy-sauce command can by run by invoking the easy-sauce binary and passing
it a list of optional configuration options. The configuration options specified
will be merged with the the base configuration options set in either the
package.json file of the current working directory (under the "easySauce" key),
or, if the -c or --config option is specified, the JSON file at that location.

Options:

  -c, --config       A JSON config file to use instead of package.json.

  -u, --username     Your Sauce Labs username.
                     This defaults to the SAUCE_USERNAME environment variable.

  -k, --key          Your Sauce Labs access key.
                     This defaults to the SAUCE_ACCESS_KEY environment variable.

  -P, --platforms    An array of platform/browser/version capabilities.
                     This should be a JSON array of arrays, e.g.: '[["Windows
                     10", "chrome", "latest"], ["OS X 10.11", "safari", "9"]]'.
                     See https://goo.gl/tPnZDO for details.

  -t, --test-path    The URL path to the file that loads the tests.
                     Defaults to "/test/"

  -p, --port         The port to run the local server on.
                     Defaults to "8080"

  -b, --build        The build number to pass to Sauce Labs.
                     Defaults to the current time: $(date +%s)

  -n, --name         The name of the build to pass to Sauce Labs.
                     Defaults to "JS Unit Tests".

  -f, --framework    The test framework you're using. This can be "mocha",
                     "jasmine", "qunit", "YUI Test", or "custom".
                     Defaults to "mocha".
                     See https://goo.gl/5KfjDS for details.

  -s, --service      Service used to create the tunnel to localhost.
                     This can be "localtunnel", "ngrok", or "sauce-connect".
                     Defaults to "localtunnel".
                     See package details here:
                     https://www.npmjs.com/package/localtunnel
                     https://www.npmjs.com/package/ngrok
                     https://www.npmjs.com/package/sauce-connect-launcher

  --service-options  JSON configuration options to be passed to the tunnel
                     service. This is useful if you have a paid ngrok account
                     or need to specify additional sauce-connect options.
                     Example:
                     -s='sauce-connect' --service-options='{"verbose":true}'

  -h, --help         Displays this help message.

  -V, --version      Display the easy-sauce version number.
```

While all `easy-sauce` options can be specified on the command line, it's usually easiest to declare the configuration options in an external JSON file that you reference via the `-c` or `--config` option.

```sh
easy-sauce -c path/to/config.json
```

If you're testing an npm package, you can skip the external configuration file and specify your configuration options directly in `package.json` file under the `"easySauce"` key:


```json
{
  "name": "my-package",
  "version": "1.0.0",
  "scripts": {
    "test": "easy-sauce"
  },
  // ...
  "easySauce": {
    "port": "8080",
    "testPath": "/test/runner.html",
    "platforms": [
      [
        "Windows 10",
        "chrome",
        "latest"
      ],
      [
        "Linux",
        "firefox",
        "latest"
      ],
      [
        "OS X 10.11",
        "safari",
        "9"
      ]
    ],
    "service": "sauce-connect",
    "serviceOptions": {
      "verbose": true
    }
  }
}
```

In the above example, the `"test"` command is also set to `easy-sauce`, so now you can run your tests via npm:

```
npm test
```

This setup makes it very easy to integrate with services like Travis CI that use a lot of npm conventions as their default.

Platforms can also be specified using the "zuul" [format](https://github.com/defunctzombie/zuul/wiki/Zuul.yml#browsers-required). For example:

```json
{
  "platforms": [
    {
      "name": "internet explorer",
      "version": "oldest..latest"
    },
    {
      "name": "chrome",
      "version": ["oldest", "latest"]
    }
  ]
}
```

#### Keeping your Sauce Labs credentials secret

While it's possible to specify your Sauce Labs username and access key in your configuration file or `package.json`, if you want to keep them secret you can assign them to the `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment variables, and the `easy-sauce` CLI will automatically use those values.

### Node.js API

To use Easy Sauce in Node.js, you can `require('easy-sauce')`, which gives you a function that you invoke with a configuration options object corresponding to the CLI options listed above

The function returns an [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) instance, which emits the following events that you can listen to and determine the progress of the tests.

<table>
  <tr valign="top">
    <th align="left">Name</th>
    <th align="left">Arguments</th>
    <th align="left">Description</th>
  </tr>
  <tr valign="top">
    <td><code>message</code></td>
    <td><code>message</code> (string) The message text.</td>
    <td>Emitted when an event has occurred that may be useful for the user to know (e.g. the public URL of the tests after an ngrok tunnel has been created).</td>
  </tr>
  <tr valign="top">
    <td><code>update</code></td>
    <td><code>job</code> (Object) The updated JSON job data from Sauce Labs.</td>
    <td>Emitted when the status of a <a href="https://wiki.saucelabs.com/display/DOCS/JavaScript+Unit+Testing+Methods">job</a> has changed.</td>
  </tr>
  <tr valign="top">
    <td><code>done</code></td>
    <td>
      <code>passed</code> (boolean) True if all tests passed.<br>
      <code>jobs</code> (Object) The final JSON jobs data from Sauce Labs.
    </td>
    <td>Emitted when all test <a href="https://wiki.saucelabs.com/display/DOCS/JavaScript+Unit+Testing+Methods">jobs</a> have finished running.</td>
  </tr>
  <tr valign="top">
    <td><code>error</code></td>
    <td><code>err</code> (Error) The error object thrown.
    <td>Emitted if an error occured while running the tests.</td>
  </tr>
</table>

Example Node.js usage:

```js
const easySauce = require('easy-sauce');

easySauce({
  username: process.env.SAUCE_USERNAME,
  key: process.env.SAUCE_ACCESS_KEY,
  platforms: [
    [
      'Windows 10',
      'chrome',
      'latest'
    ],
    [
      'Linux',
      'firefox',
      'latest'
    ],
    [
      'OS X 10.11',
      'safari',
      '9'
    ]
  ]
})
.on('message', function(message) {
  // A message has been emitted, inform the user.
  console.log(message);
})
.on('update', function(job) {
  // A job's status has been updated
  console.log(job.status);
})
.on('done', function(passed, jobs) {
  // All tests have completed!
  if (passed) {
    console.log('All tests passed!');
  }
  else {
    console.log('Oops, there were failures:\n' + jobs);
  }
})
.on('error', function(err) {
  // An error occurred at some point running the tests.
  console.error(err.message);
});
```

## Running the tests

If you'd like to contribute to the Easy Sauce library, make sure your changes pass the existing test suite. If your changes significantly alter the functionality of the library, make sure to update the tests in the `/test` directory.

You can run the tests with the following command:

```
npm test
```
