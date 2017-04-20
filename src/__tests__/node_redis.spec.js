'use strict';

const tape = require('tape-catch');
const SplitFactory = require('../');

const config = {
  core: {
    authorizationKey: '5i7avi2rpj8i7qg99fhmc38244kcineavla0'
  },
  urls: {
    sdk: 'https://sdk-aws-staging.split.io/api',
    events: 'https://events-aws-staging.split.io/api'
  },
  storage: {
    type: 'REDIS',
    prefix: 'REDIS_NODE_UT'
  }
};

tape('NodeJS Redis', async (assert) => {
  const sdk = SplitFactory(config);
  const client = sdk.client();

  assert.equal(await client.getTreatment('UT_Segment_member', 'UT_IN_SEGMENT'), 'on');
  assert.equal(await client.getTreatment('other', 'UT_IN_SEGMENT'), 'off');

  assert.equal(await client.getTreatment('UT_Segment_member', 'UT_NOT_IN_SEGMENT'), 'off');
  assert.equal(await client.getTreatment('other', 'UT_NOT_IN_SEGMENT'), 'on');

  assert.equal(await client.getTreatment('UT_Segment_member', 'UT_SET_MATCHER', {
    permissions: ['admin']
  }), 'on');
  assert.equal(await client.getTreatment('UT_Segment_member', 'UT_SET_MATCHER', {
    permissions: ['not_matching']
  }), 'off');

  assert.equal(await client.getTreatment('UT_Segment_member', 'UT_NOT_SET_MATCHER', {
    permissions: ['create']
  }), 'off');
  assert.equal(await client.getTreatment('UT_Segment_member', 'UT_NOT_SET_MATCHER', {
    permissions: ['not_matching']
  }), 'on');

  client.destroy();
  assert.end();
});

