import tape from 'tape-catch';
import { settingsValidator } from '../browser';

tape('SETTINGS / Integrations should be properly parsed', assert => {
  const settings = settingsValidator({
    core: {
      authorizationKey: 'dummy token'
    },
    integrations: [
      { type: 'GOOGLE_ANALYTICS_TO_SPLIT', prefix: 'prefix1' },
      { type: 'INVALID_INTEGRATION', prefix: 'prefix2' },
      { type: 'SPLIT_TO_GOOGLE_ANALYTICS', prefix: 'prefix3' },
      { type: 'INVALID_INTEGRATION_2', prefix: 'prefix4' },
      {},
      'INVALID'
    ]
  });

  assert.deepEqual(settings.integrations, [
    { type: 'GOOGLE_ANALYTICS_TO_SPLIT', prefix: 'prefix1' },
    { type: 'SPLIT_TO_GOOGLE_ANALYTICS', prefix: 'prefix3' }
  ], 'Filters invalid integrations from `integrations` array');

  assert.deepEqual(settingsValidator({
    core: {
      authorizationKey: 'dummy token'
    },
    integrations: 'INVALID'
  }).integrations, [], 'Returns an empty array if `integrations` is an invalid object');

  assert.end();
});

tape('SETTINGS / Consent is overwritable and "GRANTED" by default in client-side', assert => {
  let settings = settingsValidator({});
  assert.equal(settings.userConsent, 'GRANTED', 'userConsent defaults to granted if not provided.');

  settings = settingsValidator({ userConsent: 'INVALID-VALUE' });
  assert.equal(settings.userConsent, 'GRANTED', 'userConsent defaults to granted if a wrong value is provided.');

  settings = settingsValidator({ userConsent: 'UNKNOWN' });
  assert.equal(settings.userConsent, 'UNKNOWN', 'userConsent can be overwritten.');

  settings = settingsValidator({ userConsent: 'declined' });
  assert.equal(settings.userConsent, 'DECLINED', 'userConsent can be overwritten.');

  assert.end();
});
