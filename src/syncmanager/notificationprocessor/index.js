import { Types, errorParser, messageParser } from './notificationparser';

// @TODO logging
export default function NotificationProcessorFactory(callbacks, partialProducers) {

  function handleEvent(eventData, channel) {
    switch (eventData.type) {
      case Types.SPLIT_UPDATE:
        callbacks.splitSync.queueSyncSplits(
          eventData.changeNumber);
        break;
      case Types.SEGMENT_UPDATE:
        callbacks.segmentSync.queueSyncSegments(
          eventData.changeNumber,
          eventData.segmentName);
        break;
      case Types.MY_SEGMENTS_UPDATE: {
        // @TODO test the following way to get the userKey from the channel hash
        const userKeyHash = channel.split('_')[2];
        const userKey = partialProducers.userKeyHashes[userKeyHash];
        callbacks.segmentSync.queueSyncMySegments(
          eventData.changeNumber,
          userKey,
          eventData.includesPayload ? eventData.segmentList : undefined);
        break;
      }
      case Types.SPLIT_KILL:
        callbacks.splitSync.killSplit(
          eventData.changeNumber,
          eventData.splitName,
          eventData.defaultTreatment);
        break;
      // @REVIEW do we need to close the connection if STREAMING_DOWN?
      case Types.STREAMING_DOWN:
        callbacks.startPolling();
        break;
      case Types.STREAMING_UP:
        callbacks.stopPolling();
        callbacks.syncAll();
        break;
      // @REVIEW is there some scenario where we should consider a DISCONNECT event type?
      case Types.RECONNECT:
        callbacks.reconnectPush();
        break;
    }
  }

  return {
    handleOpen() {
      // @REVIEW: call handleEvent({type: Types.STREAMING_UP}); // or Types.STREAMING_RECONNECTED according to spec
      feedbackLoop.syncAll();
    },

    handleClose() {
      // @REVIEW: call handleEvent({type: Types.STREAMING_DOWN});
      feedbackLoop.startPolling();
    },

    handleError(error) {
      const errorData = errorParser(error);
      // @TODO logic of NotificationManagerKeeper
      // @TODO close connection to avoid reconnect loop
      this.handleEvent(errorData);
    },

    handleMessage(message) {
      const messageData = messageParser(message);
      // @TODO logic of NotificationManagerKeeper
      handleEvent(messageData.data, messageData.channel);
    },

  };
}