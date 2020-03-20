import PushManagerFactory from './pushmanager';
import FullProducerFactory from '../producer';

/**
 * Factory of sync manager
 * It was designed considering a plugable PushManager:
 * if the push manager is available, the SyncManager passes down the responsability of handling producer
 *
 * @param context main client context
 */
export default function NodeSyncManagerFactory(context) {

  const settings = context.get(context.constants.SETTINGS);
  let pushManager = undefined;
  let producer = undefined;

  function startPolling() {
    if (!producer.isRunning())
      producer.start();
  }

  // for the moment, `stopPolling` is called together with `syncAll`, but they are separated for future scenarios
  function stopPolling() {
    // if polling, stop
    if (producer.isRunning())
      producer.stop();
  }

  function syncAll() {
    // fetch splits and segments
    // @TODO handle errors
    producer.callSplitsUpdater().then(() => {
      producer.callSegmentsUpdater();
    });
  }

  return {
    startMainClient(context) {
      producer = FullProducerFactory(context);
      // start syncing
      if (settings.streamingEnabled)
        pushManager = PushManagerFactory({
          startPolling,
          stopPolling,
          syncAll,
        }, context, producer);
      if (!pushManager)
        producer.start();
    },
    stopMainClient() {
      // stop syncing
      if (pushManager)
        pushManager.stopFullProducer(producer);
      else
        producer.stop();
    },
  };
}