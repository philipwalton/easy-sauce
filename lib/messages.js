'use strict';


module.exports = function(message, ...args) {
  switch (message) {
    case 'BROWSERS_REQUIRED':
      return 'A list of browsers/platforms is required.';
    case 'CREDENTIALS_REQUIRED':
      return 'A Sauce Labs username and access key are required.';
    case 'SERVER_STARTED':
      return `Started static web server on port ${args[0]}`;
    case 'PORT_TAKEN':
      return `Error starting server, port ${args[0]} is already in use`;
    case 'TUNNEL_CREATED':
      return `Created secure tunnel to localhost:${args[0]}`;
    case 'JOBS_STARTED':
      return `Running tests for ${args[0]} on Sauce Labs.`;
    case 'JOBS_START_ERROR':
      return `Error starting tests: ${args[0]}`;
    case 'JOBS_PROGRESS_ERROR':
      return `Error fetching test progress: ${args[0]}`;
    default:
      throw new Error('No matching message ID.');
  }
};
