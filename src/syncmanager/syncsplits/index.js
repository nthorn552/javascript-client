/**
 *
 * @param {*} splitStorage
 * @param {*} splitProducer
 */
export default function syncSplitsFactory(splitStorage, splitProducer) {

  function queueSyncSplits(changeNumber) {
    splitProducer.callSplitsUpdater(changeNumber);
  }
  function killSplit(changeNumber, splitName, defaultTreatment) {
    splitStorage.killSplit(splitName, defaultTreatment);
    splitProducer.callSplitsUpdater(changeNumber);
  }

  return {
    queueSyncSplits,
    killSplit,
  };
}