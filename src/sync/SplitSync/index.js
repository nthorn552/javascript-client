import killLocally from '../../storage/SplitCache/killLocally';

/**
 * SplitsSync class
 */
export default class SplitSync {

  /**
   * @param {Object} splitStorage splits cache
   * @param {Object} splitProducer node producer or full browser producer
   */
  constructor(splitStorage, splitProducer) {
    this.splitStorage = splitStorage;
    this.splitProducer = splitProducer;
    this.maxChangeNumber = 0;
  }

  // Private method
  // Preconditions: this.splitProducer.isSplitsUpdaterRunning === false
  __handleSyncSplitsCall() {
    if (this.maxChangeNumber > this.splitStorage.getChangeNumber()) {
      this.splitProducer.callSplitsUpdater().then(() => {
        this.__handleSyncSplitsCall();
      });
    } else {
      this.maxChangeNumber = 0;
    }
  }

  /**
   * Invoked on SPLIT_UPDATE notification.
   *
   * @param {number} changeNumber change number of the SPLIT_UPDATE notification
   */
  queueSplitChanges(changeNumber) {
    const currentChangeNumber = this.splitStorage.getChangeNumber();

    if (changeNumber <= currentChangeNumber && changeNumber <= this.maxChangeNumber) return;

    this.maxChangeNumber = changeNumber;

    if (this.splitProducer.isSplitsUpdaterRunning()) return;

    this.__handleSyncSplitsCall();
  }

  /**
   * Invoked on SPLIT_KILL notification
   *
   * @param {number} changeNumber change number of the SPLIT_UPDATE notification
   * @param {string} splitName name of split to kill
   * @param {string} defaultTreatment default treatment value
   */
  killSplit(changeNumber, splitName, defaultTreatment) {
    killLocally(this.splitStorage, splitName, defaultTreatment, changeNumber);
    this.queueSplitChanges(changeNumber);
  }

}