import { splitApiFactory } from '@nthorn-splitio/splitio-commons/src/services/splitApi';
import { syncManagerOnlineFactory } from '@nthorn-splitio/splitio-commons/src/sync/syncManagerOnline';
import { pushManagerFactory } from '@nthorn-splitio/splitio-commons/src/sync/streaming/pushManager';
import { pollingManagerCSFactory } from '@nthorn-splitio/splitio-commons/src/sync/polling/pollingManagerCS';
import { InLocalStorage } from '@nthorn-splitio/splitio-commons/src/storages/inLocalStorage';
import { InMemoryStorageCSFactory } from '@nthorn-splitio/splitio-commons/src/storages/inMemory/InMemoryStorageCS';
import { sdkManagerFactory } from '@nthorn-splitio/splitio-commons/src/sdkManager';
import { sdkClientMethodCSFactory } from '@nthorn-splitio/splitio-commons/src/sdkClient/sdkClientMethodCSWithTT';
import { impressionObserverCSFactory } from '@nthorn-splitio/splitio-commons/src/trackers/impressionObserver/impressionObserverCS';
import { integrationsManagerFactory } from '@nthorn-splitio/splitio-commons/src/integrations/browser';
import { __InLocalStorageMockFactory } from '@nthorn-splitio/splitio-commons/src/utils/settingsValidation/storage/storageCS';
import { sdkFactory } from '@nthorn-splitio/splitio-commons/src/sdkFactory';
import { LOCALHOST_MODE, STORAGE_LOCALSTORAGE } from '@nthorn-splitio/splitio-commons/src/utils/constants';
import { createUserConsentAPI } from '@nthorn-splitio/splitio-commons/src/consent/sdkUserConsent';

import { settingsFactory } from '../settings/browser';
import { platform, SignalListener } from '../platform';

const syncManagerOnlineCSFactory = syncManagerOnlineFactory(pollingManagerCSFactory, pushManagerFactory);

function getStorage(settings) {
  return settings.storage.type === STORAGE_LOCALSTORAGE ?
    InLocalStorage(settings.storage)
    : settings.storage.__originalType === STORAGE_LOCALSTORAGE ?
      __InLocalStorageMockFactory
      : InMemoryStorageCSFactory;
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

    syncManagerFactory: syncManagerOnlineCSFactory,

    sdkManagerFactory,

    sdkClientMethodFactory: sdkClientMethodCSFactory,

    SignalListener,

    integrationsManagerFactory: settings.integrations && settings.integrations.length > 0 ? integrationsManagerFactory.bind(null, settings.integrations) : undefined,

    impressionsObserverFactory: impressionObserverCSFactory,

    extraProps: (params) => {
      return {
        UserConsent: createUserConsentAPI(params)
      };
    }
  };

  switch (settings.mode) {
    case LOCALHOST_MODE:
      modules.splitApiFactory = undefined;
      modules.syncManagerFactory = settings.sync.localhostMode;
      modules.SignalListener = undefined;
      break;
  }

  return modules;
}

/**
 * SplitFactory for client-side.
 *
 * @param {SplitIO.IBrowserSettings} config configuration object used to instantiate the SDK
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
