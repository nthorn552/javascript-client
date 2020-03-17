/**
 * TODO
 *  - test 'encodeToBase64' and 'decodeFromBase64'
 *    - in browser (atob/btoa)
 *    - in others (neither browser and node)
 */

import tape from 'tape';
import { jwtSample, decodedJwtPayloadSample, base64sample, decodedBase64sample, userKeySample, userKeyBase64HashSample } from '../../../syncmanager/__tests__/mocks/dataMocks';

import { encodeToBase64, decodeFromBase64, decodeJWTtoken, hashUserKey } from '../../push';

tape('encodeToBase64', assert => {

  assert.deepEqual(encodeToBase64(decodedBase64sample), base64sample, 'encodes string to base64');
  assert.end();

});

tape('decodeFromBase64', assert => {

  assert.deepEqual(decodeFromBase64(base64sample), decodedBase64sample, 'decodes base64 string');
  assert.end();

});

tape('decodeJWTtoken', assert => {

  assert.deepEqual(decodeJWTtoken(jwtSample), decodedJwtPayloadSample, 'decodes JWT token');
  assert.end();

});

tape('hashUserKey', assert => {

  assert.deepEqual(hashUserKey(userKeySample), userKeyBase64HashSample, 'hashes key and encodes to base64');
  assert.end();

});