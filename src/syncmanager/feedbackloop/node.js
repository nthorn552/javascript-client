export default function NodeFeedbackLoopFactory(producer, connectCallback) {
  return {
    startPolling() {
      if (!producer.isRunning())
        producer.start();
    },

    stopPollingAnsSyncAll() {
      if (producer.isRunning())
        producer.stop();
      // fetch splits and segments.
      producer.callSplitsUpdater();
      producer.callSegmentsUpdater();
    },

    // @REVIEW maybe this method is not necessary, at least that NotificationProcessor have to reconnect
    // (i.e., authenticate and open de SSE connection) for some events
    reconnectPush() {
      connectCallback();
    },

    queueKillSplit(changeNumber, splitName, defaultTreatment) {
      // @TODO use queue
      producer.callKillSplit(changeNumber, splitName, defaultTreatment);
    },

    queueSyncSplits(changeNumber){
      // @TODO use queue
      producer.callSplitsUpdater(changeNumber);
    },

    queueSyncSegments(changeNumber){
      // @TODO use queue
      producer.callSegmentsUpdater(changeNumber);
    },
  };
}