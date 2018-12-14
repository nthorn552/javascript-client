/**
Copyright 2016 Split Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

const processPipelineAnswer = (results) =>
  results.reduce((accum, [err, value]) => {
    if (err === null) {
      try {
        return accum.concat(value.map(JSON.parse));
      } catch(e) {
        // noop
      }
    }
    return accum;
  }, []);

class ImpressionsCacheInRedis {

  constructor(keys, redis, meta) {
    this.keys = keys;
    this.redis = redis;
    this.meta = meta;
  }

  scanKeys() {
    return this.redis.keys(this.keys.searchPatternForImpressions());
  }

  state() {
    return this.scanKeys().then((listOfKeys) => this.redis.pipeline(listOfKeys.map(k => ['smembers', k])).exec()).then(processPipelineAnswer);
  }

  track(impression) {
    return this.redis.rpush(
      this.keys.buildImpressionsKey(),
      this.toJSON(impression)
    ).then(queuedCount => {
      // If this is the creation of the key on Redis, set the expiration for it in 1hr.
      if (queuedCount === 1) {
        this.redis.expire(this.keys.buildImpressionsKey(), 3600);
      }
    });
  }

  clear() {
    return this.scanKeys().then((listOfKeys) => {
      if (listOfKeys.length)
        return this.redis.del(listOfKeys);
    });
  }

  toJSON(impression) {
    const {
      keyName, bucketingKey, feature, treatment, label, time, changeNumber
    } = impression;

    return JSON.stringify({
      m: this.meta,
      i: {
        k: keyName,
        b: bucketingKey,
        f: feature,
        t: treatment,
        r: label,
        c: changeNumber,
        m: time
      }
    });
  }

  /**
   * We are returning true because the go syncronizer push the impressions from redis.
   */
  isEmpty() {
    return true;
  }
}

export default ImpressionsCacheInRedis;
