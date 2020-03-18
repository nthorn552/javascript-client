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

import logFactory from '../utils/logger';
const log = logFactory('splitio-producer:updater');
import repeat from '../utils/fn/repeat';
import SplitChangesUpdater from './updater/SplitChanges';
import SegmentChangesUpdater from './updater/SegmentChanges';

/**
 * Expose start / stop mechanism for pulling data from services.
 */
const NodeUpdater = (context) => {
  const splitsUpdater = SplitChangesUpdater(context, true /* tell split updater we are in node */);
  const segmentsUpdater = SegmentChangesUpdater(context);
  const settings = context.get(context.constants.SETTINGS);

  let stopSplitsUpdate = false;
  let stopSegmentsUpdate = false;
  let isRunning = false;

  let isSplitsUpdaterRunning = false;
  let splitChangesQueue = [];
  let lastSplitChangeNumber = -1;

  // Preconditions: isSplitsUpdaterRunning === false
  function dequeSplitsUpdaterCalls() {
    if (splitChangesQueue.length > 0) {
      splitChangesQueue.sort((a, b) => b - a);
      if (splitChangesQueue[0] > lastSplitChangeNumber) {
        splitChangesQueue = [];
        isSplitsUpdaterRunning = true;
        splitsUpdater().then((changeNumber) => {
          lastSplitChangeNumber = changeNumber;
          isSplitsUpdaterRunning = false;
          dequeSplitsUpdaterCalls();
        });
      }
    }
  }

  return {
    start() {
      log.info('Starting NODEJS updater');
      log.debug(`Splits will be refreshed each ${settings.scheduler.featuresRefreshRate} millis`);
      log.debug(`Segments will be refreshed each ${settings.scheduler.segmentsRefreshRate} millis`);

      // Schedule incremental update of segments only if needed
      const spinUpSegmentUpdater = () => {
        if (!stopSegmentsUpdate) {
          stopSegmentsUpdate = repeat(
            scheduleSegmentsUpdate => {
              log.debug('Fetching segments');
              segmentsUpdater().then(() => scheduleSegmentsUpdate());
            },
            settings.scheduler.segmentsRefreshRate
          );
        }
      };

      stopSplitsUpdate = repeat(
        scheduleSplitsUpdate => {
          log.debug('Fetching splits');
          isSplitsUpdaterRunning = true;
          splitsUpdater()
            .then((changeNumber) => {
              lastSplitChangeNumber = changeNumber;
              isSplitsUpdaterRunning = false;
              // Spin up the segments update if needed
              spinUpSegmentUpdater();
              // Re-schedule update
              scheduleSplitsUpdate();
              // @REVIEW should we call `dequeSplitsUpdaterCalls` here?
            });
        },
        settings.scheduler.featuresRefreshRate
      );

      isRunning = true;
    },

    stop() {
      log.info('Stopping NODEJS updater');

      stopSplitsUpdate && stopSplitsUpdate();
      stopSegmentsUpdate && stopSegmentsUpdate();

      isRunning = false;
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning() {
      return isRunning;
    },

    // Synchronous call to SplitsUpdater and MySegmentsUpdater, used in PUSH mode by queues/workers.
    callSplitsUpdater(changeNumber = lastSplitChangeNumber + 1) {
      if (changeNumber <= lastSplitChangeNumber)
        return;

      splitChangesQueue.unshift(changeNumber);

      if (isSplitsUpdaterRunning) {
        return;
      }

      dequeSplitsUpdaterCalls();
    },

    callSegmentsUpdater(changeNumber, segmentName) {
      if (changeNumber) {
        // @TODO check if changeNumber is older
        return;
      }

      // @TODO
      segmentName;
      segmentsUpdater();
    }
  };
};

export default NodeUpdater;