import PushManagerFactory from './PushManager';
import FullProducerFactory from '../producer';
import PartialProducerFactory from '../producer/browser/Partial';
import { matching } from '../utils/key/factory';
import { forOwn } from '../utils/lang';
import { hashUserKey } from '../utils/push';

/**
 * Factory of sync manager
 * It was designed considering:
 * - a plugable PushManager: if the push manager is available, the SyncManager passes down the responsability of handling producer
 * - keep a single partialProducer per userKey instead of shared client, to avoid unnecessary /mySegments requests
 *
 * @param context main client context
 */
export default function BrowserSyncManagerFactory(context) {

  const settings = context.get(context.constants.SETTINGS);
  let pushManager = undefined;
  let producer = undefined;

  const clients = {
    // mapping of user keys to hashes
    userKeys: {},
    // inverse mapping of hashes to user keys
    userKeyHashes: {},
    // reference to partial producer (`producer`) and segments storage (`mySegmentsStorage`) per client, to handle synchronization
    clients: {},
  };

  function addClient(userKey, clientContext, isMainClient) {
    if (!clients.clients[userKey]) {
      const producer = isMainClient ? FullProducerFactory(clientContext) : PartialProducerFactory(clientContext);
      const mySegmentsStorage = clientContext.get(context.constants.STORAGE).segments;
      clients.clients[userKey] = { producer, mySegmentsStorage, count: 1 };

      const hash = hashUserKey(userKey);
      clients.userKeys[userKey] = hash;
      clients.userKeyHashes[hash] = userKey;

      return producer;
    } else {
      // if previously created, count it
      clients.clients[userKey].count++;
    }
  }

  function removeClient(userKey) {
    const client = clients.clients[userKey];
    if (client) {
      client.count--;
      if (client.count === 0) {
        delete clients.clients[userKey];
        delete clients.userKeyHashes[clients.userKeys[userKey]];
        delete clients.userKeys[userKey];
        return client.producer;
      }
    }
  }

  function startPolling() {
    forOwn(clients.clients, function (entry) {
      if (!entry.producer.isRunning())
        entry.producer.start();
    });
  }

  function stopPolling() {
    // if polling, stop
    forOwn(clients.clients, function (entry) {
      if (entry.producer.isRunning())
        entry.producer.stop();
    });
  }

  function syncAll() {
    // fetch splits and segments
    // @TODO handle errors
    producer.callSplitsUpdater();
    // @TODO review precence of segments to run mySegmentUpdaters
    forOwn(clients.clients, function (entry) {
      entry.producer.callMySegmentsUpdater();
    });
  }

  return {

    startMainClient(context) {
      // create fullProducer and save reference in the `clients` list
      // in order to keep a single partialProducer for the same user key.

      const userKey = matching(settings.core.key);
      producer = addClient(userKey, context, true);

      if (settings.streamingEnabled)
        pushManager = PushManagerFactory({
          startPolling,
          stopPolling,
          syncAll,
        }, context, producer, clients);

      // start syncing
      if (pushManager) {
        syncAll();
        pushManager.connectPush();
      } else {
        producer.start();
      }
    },

    stopMainClient() {
      // stop syncing
      if (pushManager)
        pushManager.stopPush();

      if (producer.isRunning())
        producer.stop();
    },

    startSharedClient(sharedContext, settings) {

      const userKey = matching(settings.core.key);
      const partialProducer = addClient(userKey, sharedContext, false);
      if (partialProducer) {
        // start syncing
        if (pushManager) {
          // reconnect pushmanager to subscribe to the new mySegments channel
          pushManager.connectPush();
        } else {
          // start polling
          partialProducer.start();
        }
      }
    },

    stopSharedClient(sharedContext, settings) {

      const userKey = matching(settings.core.key);

      const partialProducer = removeClient(userKey);
      if (partialProducer && partialProducer.isRunning()) {
        partialProducer.stop();

        // does not reconnect pushmanager when removing a client,
        // since it is more costly than continue listening the channel
        // if (pushManager)
        //   pushManager.connectPush();
      }
    },
  };
}