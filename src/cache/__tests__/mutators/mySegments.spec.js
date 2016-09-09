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
'use strict';

const ava = require('ava');
const SegmentsStorage = require('../../../lib/storage/segments/browser');
const MySegmentsMutatorFactory = require('../../../lib/mutators/mySegments');

ava('Segment mutator', assert => {
  const segmentNames = ['segment1', 'segment2'];
  const segments = new SegmentsStorage;
  const mutator = MySegmentsMutatorFactory(segmentNames);

  mutator({segments});

  for (const name of segmentNames) {
    assert.true(segments.has(name), 'segment should be present in the storage');
  }

  assert.end();
});
