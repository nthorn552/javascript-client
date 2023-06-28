import { splitApiFactory } from '@nthorn-splitio/splitio-commons/src/services/splitApi';
import { syncManagerOnlineFactory } from '@nthorn-splitio/splitio-commons/src/sync/syncManagerOnline';
import { pushManagerFactory } from '@nthorn-splitio/splitio-commons/src/sync/streaming/pushManager';
import { pollingManagerSSFactory } from '@nthorn-splitio/splitio-commons/src/sync/polling/pollingManagerSS';
import { InRedisStorage } from '@nthorn-splitio/splitio-commons/src/storages/inRedis';
import { InMemoryStorageFactory } from '@nthorn-splitio/splitio-commons/src/storages/inMemory/InMemoryStorage';
import { sdkManagerFactory } from '@nthorn-splitio/splitio-commons/src/sdkManager';
import { sdkClientMethodFactory } from '@nthorn-splitio/splitio-commons/src/sdkClient/sdkClientMethod';
import { impressionObserverSSFactory } from '@nthorn-splitio/splitio-commons/src/trackers/impressionObserver/impressionObserverSS';
import { sdkFactory } from '@nthorn-splitio/splitio-commons/src/sdkFactory';
import { CONSUMER_MODE, LOCALHOST_MODE } from '@nthorn-splitio/splitio-commons/src/utils/constants';

import { settingsFactory } from '../settings/node';
import { platform, SignalListener } from '../platform';
import { bloomFilterFactory } from '../platform/filter/bloomFilter';

const syncManagerOnlineSSFactory = syncManagerOnlineFactory(pollingManagerSSFactory, pushManagerFactory);

function getStorage(settings) {
  return settings.storage.type === 'REDIS' ?
    InRedisStorage(settings.storage) :
    InMemoryStorageFactory;
}

/**
 *
 * @param {import("@nthorn-splitio/splitio-commons/types/types").ISettings} settings
 */
function getModules(settings) {

  const modules = {
    settings,

    platform,

    storageFactory: getStorage(settings),

    splitApiFactory,

    syncManagerFactory: syncManagerOnlineSSFactory,

    sdkManagerFactory,

    sdkClientMethodFactory,

    SignalListener,

    impressionsObserverFactory: impressionObserverSSFactory,

    filterAdapterFactory: bloomFilterFactory
  };

  switch (settings.mode) {
    case LOCALHOST_MODE:
      modules.splitApiFactory = undefined;
      modules.syncManagerFactory = settings.sync.localhostMode;
      modules.SignalListener = undefined;
      break;
    case CONSUMER_MODE:
      modules.syncManagerFactory = undefined;
      break;
  }

  return modules;
}

/**
 * SplitFactory for server-side.
 *
 * @param {SplitIO.INodeSettings | SplitIO.INodeAsyncSettings} config configuration object used to instantiate the SDK
 * @param {Function=} __updateModules optional function that lets redefine internal SDK modules. Use with
 * caution since, unlike `config`, this param is not validated neither considered part of the public API.
 * @throws Will throw an error if the provided config is invalid.
 */
export function SplitFactory(config, __updateModules) {
  const settings = settingsFactory(config);
  const modules = getModules(settings);
  if (__updateModules) __updateModules(modules);
  return sdkFactory(modules);
}
