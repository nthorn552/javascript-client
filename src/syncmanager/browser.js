import PushManagerFactory from './pushmanager';

export default function BrowserSyncManagerFactory(settings) {

  let pushManager = undefined;
  return {
    startFullProducer(producer) {
      if (settings.streamingEnabled)
        pushManager = PushManagerFactory(settings, producer, true);
      if (!pushManager)
        producer.start();
      else {
        const userKey = settings.core.key;
        pushManager.addProducerWithMySegmentsUpdater(userKey, producer);
      }
    },
    stopFullProducer(producer) {
      if (pushManager)
        pushManager.stopFullProducer(producer);
      else
        producer.stop();
    },
    startPartialProducer(producer, sharedSettings) {
      if (pushManager) {
        const userKey = sharedSettings.core.key;
        pushManager.addProducerWithMySegmentsUpdater(userKey, producer);
      } else
        producer.start();
    },
    stopPartialProducer(producer, sharedSettings) {
      if (pushManager) {
        const userKey = sharedSettings.core.key;
        pushManager.removeProducerWithMySegmentsUpdater(userKey, producer);
      } else
        producer.stop();
    },
  };
}