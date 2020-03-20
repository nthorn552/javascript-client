import SSEClient from '../sseclient';
import authenticate from '../authclient';
import NotificationProcessorFactory from '../notificationprocessor';
import logFactory from '../../utils/logger';
const log = logFactory('splitio-pushmanager');
import syncSplitsFactory from '../splitSync';
import syncSegmentsFactory from '../segmentSync';

/**
 * Factory of the push mode manager.
 *
 * @param {*} context context of the main client
 * @param {*} producer producer of the main client
 */
export default function PushManagerFactory(syncManager, context, producer, partialProducers) {

  const sseClient = SSEClient.getInstance();

  // No return a PushManager if sseClient could not be created, due to the lack of EventSource API.
  if (!sseClient) {
    log.warn('EventSource API is not available. Fallback to polling mode');
    return undefined;
  }

  const settings = context.get(context.constants.SETTINGS);
  const storage = context.get(context.constants.STORAGE);

  /** Functions used to handle mySegments synchronization for browser */

  /** PushManager functions, according to the spec */

  function scheduleNextTokenRefresh(issuedAt, expirationTime) {
    // @REVIEW calculate delay. Currently set one minute less than delta.
    const delayInSeconds = expirationTime - issuedAt - 60;
    scheduleReconnect(delayInSeconds * 1000);
  }
  function scheduleNextReauth() {
    // @TODO calculate delay
    const delayInSeconds = 60;
    scheduleReconnect(delayInSeconds);
  }

  let timeoutID = 0;
  function scheduleReconnect(delayInMillis) {
    // @REVIEW is there some scenario where `clearScheduledReconnect` must be explicitly called?
    // cancel a scheduled reconnect if previously established, since `scheduleReconnect` is invoked on different scenarios:
    // - initial connect
    // - scheduled connects for refresh token, auth errors and sse errors.
    if (timeoutID) clearTimeout(timeoutID);
    timeoutID = setTimeout(() => {
      connect();
    }, delayInMillis);
  }

  function connect() {
    authenticate(settings, partialProducers ? partialProducers.userKeys : undefined).then(
      function (authData) {
        if (!authData.pushEnabled)
          throw new Error('Streaming is not enabled for the organization');

        // Connect to SSE and schedule refresh token
        const decodedToken = authData.decodedToken;
        sseClient.open(authData);
        scheduleNextTokenRefresh(decodedToken.iat, decodedToken.exp);
      }
    ).catch(
      function (error) {
        // @TODO: review:
        //  log messages for invalid token, 'Streaming is not enabled for the organization', http errors, etc.
        //  should we re-schedule a connect call when http errors or 'Streaming is not enabled for the organization'
        //  (in case push is enabled for that call)?
        log.error(error);

        sseClient.close();
        scheduleNextReauth();
      }
    );
  }

  /** Functions related to synchronization according to the spec (Queues and Workers) */

  const splitSync = syncSplitsFactory(storage.splits, producer);

  const segmentSync = syncSegmentsFactory(storage.segments, producer);

  /** initialization */

  const notificationProcessor = NotificationProcessorFactory({
    // SyncManager
    startPolling: syncManager.startPolling,
    stopPolling: syncManager.stopPolling,
    syncAll: syncManager.syncAll,
    // PushManager
    reconnectPush: connect,
    // SyncWorkers
    splitSync,
    segmentSync,
  }, partialProducers);
  sseClient.setEventHandler(notificationProcessor);

  syncManager.syncAll();
  connect();

  return {
    stopFullProducer(producer) { // same producer passed to NodePushManagerFactory
      // remove listener, so that when connection is closed, polling mode is not started.
      sseClient.setEventHandler(undefined);
      sseClient.close();

      if (producer.isRunning())
        producer.stop();
    },
  };
}