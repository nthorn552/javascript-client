/**
Copyright 2016 Split Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

'use strict';

const timeout = require('../../utils/promise/timeout');
const tracker = require('../../utils/timeTracker');

const splitChangesService = require('../../services/splitChanges');
const splitChangesRequest = require('../../services/splitChanges/get');

let firstFetch = true;

function splitChangesFetcher(settings, since, shouldApplyTimeout = false, metricCollectors, isNode) {
  let splitsPromise = splitChangesService(splitChangesRequest(settings, since));

  if (isNode || firstFetch) {
    tracker.start(tracker.TaskNames.SPLITS_FETCH, metricCollectors, splitsPromise);
    firstFetch = false;
  }

  if (shouldApplyTimeout) {
    splitsPromise = timeout(settings.startup.requestTimeoutBeforeReady, splitsPromise);
  }

  return splitsPromise.then(resp => resp.json());
}

module.exports = splitChangesFetcher;
