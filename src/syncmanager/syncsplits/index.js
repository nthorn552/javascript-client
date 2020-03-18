/**
 *
 * @param {*} splitStorage
 * @param {*} splitProducer
 */
export default function syncSplitsFactory(splitStorage, splitProducer) {

  let splitChangesQueue = [];

  // Preconditions: isSplitsUpdaterRunning === false
  function dequeSplitsUpdaterCalls() {
    if (splitChangesQueue.length > 0) {
      splitChangesQueue.sort((a, b) => b - a);
      if (splitChangesQueue[0] > splitStorage.getChangeNumber()) {
        splitChangesQueue = [];
        splitProducer.callSplitsUpdater().then(() => {
          dequeSplitsUpdaterCalls();
        });
      }
    }
  }

  // Invoked when: stop polling (changeNumber === undefined) and splitChange event
  function queueSyncSplits(changeNumber) {
    const currentChangeNumber = splitStorage.getChangeNumber();

    // if not changeNumber is provided (stop polling scenario), we must fetch splits.
    if (changeNumber === undefined)
      changeNumber = currentChangeNumber + 1;

    if (changeNumber <= currentChangeNumber)
      return;

    splitChangesQueue.unshift(changeNumber);

    if (splitProducer.isSplitsUpdaterRunning()) {
      return;
    }

    dequeSplitsUpdaterCalls();
  }

  function killSplit(changeNumber, splitName, defaultTreatment) {
    splitStorage.killSplit(splitName, defaultTreatment);
    queueSyncSplits(changeNumber);
  }

  return {
    queueSyncSplits,
    killSplit,
  };
}