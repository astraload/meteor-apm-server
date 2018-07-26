var collectionPersister = require('./collection');
var zlib = require('zlib');
var mongo = require('mongodb');
var _ = require('underscore');
var async = require('async');

const ErrorStackParser = require('error-stack-parser');
import {SourceMapConsumer} from 'source-map';

const fetch = require('node-fetch');
const URL_REGEXP = '^(([^:/\\?#]+):)?(//(([^:/\\?#]*)(?::([^/\\?#]*))?))?([^\\?#]*)(\\?([^#]*))?(#(.*))?$';
const rx = new RegExp(URL_REGEXP);
const sourceMapsConsumer = {};

module.exports = function tracerPersister(collName, mongoDb) {
  return function (app, traces, callback) {

    async.map(traces, deflateEvents, async function (err, compressedTraces) {
        if (err) {
          console.error('error when deflating events JSON:', err.message);
        } else {
          const mappedCompressedTraces = await mapErrorStack(compressedTraces);
          collectionPersister(collName, mongoDb)(app, mappedCompressedTraces, callback);


        }
      }
    );
  };
};

function deflateEvents(trace, callback) {
  trace = _.clone(trace);
  // events will be compressed before saving to the DB
  // this is used to reduce the data usage for the events
  var eventsJsonString = JSON.stringify(trace.events || []);
  zlib.deflate(eventsJsonString, function (err, convertedJson) {
    if (err) {
      callback(err);
    } else {
      trace.events = new mongo.Binary(convertedJson);
      trace.compressed = true;
      callback(null, trace);
    }
  });
}

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ''));
}

function mapStackTrace(traceStacks, consumer, message) {
  const stacks = JSON.parse(traceStacks);


  stacks.forEach((stack) => {
    let mappedStack = `${message}\n`;
    if (stack.stack != '') {

      const error = new Error(message);
      error.stack = stack.stack;
      const parsedError = ErrorStackParser.parse(error);

      parsedError.forEach((trace) => {
        const map = trace.lineNumber ? consumer.originalPositionFor({
          line: trace.lineNumber,
          column: trace.columnNumber
        }) : {};

        if (map.line) {
          mappedStack = `${mappedStack}${trace.source} (${map.source}:${map.line}:${map.column})\n`;
        } else {
          mappedStack = `${mappedStack}${trace.source}\n`;
        }

      });
      stack.stack = mappedStack;
    }

  });
  return JSON.stringify(stacks);
}

async function mapErrorStack(compressedTraces) {
  let appUrl = '';
  let srcHash = '';
  const mappedCompressedTraces = [...compressedTraces];

  for (let trace of mappedCompressedTraces) {
    if (trace && trace.type && trace.type === 'client' && trace.stacks) {
      if (trace.info && trace.info.url) {
        const parts = rx.exec(trace.info.url);
        appUrl = parts[1] + parts[3];
      }

      if (trace.hash && trace.sourceMap === 'true') {
        srcHash = trace.hash;
      }


      if (appUrl && srcHash) {
        const sourceMapUrl = appUrl + '/app.js.map';
        const errorMessage = trace.name ? `App hash: ${srcHash} \n${trace.name}` : 'Undefined error';

        if (!sourceMapsConsumer[srcHash]) {

          try {
            const appSecret = getAppSecret(trace.appId);

            const headers = {
              'x-auth-token': appSecret,
            };

            console.log(`Get source-map from ${sourceMapUrl} for hash:${srcHash}`);

            const sourceMapResponse = await fetch(sourceMapUrl, {headers});

            if (sourceMapResponse.status !== 200) {
              throw new Error('got ' + sourceMapResponse.status + ' response');
            }

            const sourceMapText = await sourceMapResponse.text();
            const jsonSourceMap = await parseSourceMapInput(sourceMapText);
            sourceMapsConsumer[srcHash] = await new SourceMapConsumer(jsonSourceMap);
            trace.stacks = mapStackTrace(trace.stacks, sourceMapsConsumer[srcHash], errorMessage);

          } catch (err) {

            console.error('error when fetching source map ' + sourceMapUrl + ' with hash ' + srcHash + ': ', err.message);
            delete sourceMapsConsumer[srcHash];

          }

        } else {
          trace.stacks = mapStackTrace(trace.stacks, sourceMapsConsumer[srcHash], errorMessage);

        }
      }
    }
  }
  return mappedCompressedTraces;
}

function getAppSecret(appId) {
  const app = Apps.findOne({_id: appId});
  return app.secret;
}

