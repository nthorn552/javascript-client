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

const log = require('debug')('splitio-cache:updater');

const splitChangesDataSource = require('../ds/splitChanges');

const storage = require('../storage');
const splitsStorage = storage.splits;
const update = splitsStorage.update.bind(splitsStorage);

function splitChangesUpdater() {
  log('Updating splitChanges');

  return splitChangesDataSource()
    .then(splitsMutator => splitsMutator(storage, update))
    .then(() => storage);
}

module.exports = splitChangesUpdater;
