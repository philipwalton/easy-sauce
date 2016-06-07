# Easy Sauce

[![Build Status](https://secure.travis-ci.org/philipwalton/easy-sauce.png)](http://travis-ci.org/philipwalton/easy-sauce)

Easy Sauce is a Node.js library that makes it easy to run JavaScript unit tests on the Sauce Labs cloud.

* [Installation](#installation)
* [Usage](#usage)
  * [Command Line Interface](#command-line-interface)
  * [Node.js API](#nodejs-api)
* [Running the tests](#running-the-tests)



## Installation

Easy Sauce can be installed from npm by running the following command:

```sh
npm install easy-sauce
```

## Usage

Easy Sauce comes with a command line interface (CLI) as well as a programatic API for use within Node.js.

### Command Line Interface

The `easy-sauce` command can be used as follows:

```
Usage: easy-sauce [options]

The easy-sauce command can by run by invoking the easy-sauce binary and passing
it a list of optional configuration options. The configuration options specified
will be merged with the the base configuration options set in either the
package.json file of the current working directory (under the"easySauce" key),
or, if the -c or --config option is specified, the JSON file at that location.

Options:

  -c, --config      A JSON config file to use instead of package.json.

  -u, --username    Your Sauce Labs username.
                    This defaults to the SAUCE_USERNAME environment variable.

  -k, --key         Your Sauce Labs access key.
                    This defaults to the SAUCE_ACCESS_KEY environment variable.

  -P, --platforms   An array of platform/browser/version capabilities.
                    This should be a JSON array of arrays, e.g.: '[["Windows
                    10", "chrome", "latest"], ["OS X 10.11", "safari", "9"]]'.
                    See https://goo.gl/tPnZDO for details.

  -t, --tests       The URL path to the file that loads the tests.
                    Defaults to "/test/"

  -p, --port        The port to run the local server on.
                    Defaults to "1337"

  -b, --build       The build number to pass to Sauce Labs.
                    Defaults to the current time: $(date +%s)

  -n, --name        The name of the build to pass to Sauce Labs.
                    Defaults to "JS Unit Tests".

  -f, --framework   The test framework you're using. This can be "mocha",
                    "jasmine", "qunit", "YUI Test", or "custom".
                    Defaults to "mocha".
                    See https://goo.gl/5KfjDS for details.

  -v, --verbose     Log additional information to the console, including
                    all JSON data returned by the Sauce Labs API calls.

  -q, --quiet       Suppresses all non-error message from being logged.
                    Note: error message are always logged and cause the process
                    to exit with a status code of 1.

  -h, --help        Displays this help message.

  -V, --version     Display the easy-sauce version number.
```

While all `easy-sauce` options can be specified on the command line, it's usually easiest to declare the options in your project's `package.json` file or an external JSON file that you reference via the `-c` or `--config` option.

When specifying configuration options in the `package.json` file, use the `easySauce` key. Here's an example `package.json` file with Easy Sauce configuration options:

```js
{
  "name": "my-package",
  "version": "1.0.0",
  // ...
  "easySauce": {
    "path": "/tests/suite.html",
    "port": "8080",
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
    }
  }
}
```

While it's possible to specify your Sauce Labs username and access key in your `package.json` file, if you want to keep it secret you can set the `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment variables, and the `--username` and `--key` options will automatically use those values.

### Node.js API

To use Easy Sauce in Node.js, require the `easy-sauce` function, which can be invoked with an object of configuration options corresponding to the CLI options listed above.

The function returns a [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable). When invoked from the command line, this stream is piped to `process.stdio`. When invoked fomr Node you can listen for the `data`, `end`, and `error` events to determine the progress of the tests.

```js
const easySacue = require('easy-sauce');

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
  }
})
.on('data', (message) => {
  // A progress message has been added to the stream.
})
.on('error', (err) => {
  // An error occurred at some point running the tests.
})
.on('end', () => {
  // All tests have completed.
});
```

## Running the tests

If you'd like to contribute to the Easy Sauce library, make sure your change pass the existing test suite. If your changes significantly alter the functionality of the library, make sure to update the tests in the `/test` directory.

You can run the tests with the following command:

```
npm test
```
