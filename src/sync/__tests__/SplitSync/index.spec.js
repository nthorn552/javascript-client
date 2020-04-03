import tape from 'tape';
import sinon from 'sinon';
import SplitCacheInMemory from '../../../storage/SplitCache/InMemory';
import SplitSync from '../../SplitSync';

function ProducerMock(splitStorage) {

  const __splitsUpdaterCalls = [];

  function __splitsUpdater() {
    return new Promise((res, rej) => { __splitsUpdaterCalls.push({ res, rej }); });
  }

  let __isSplitsUpdaterRunning = false;

  function isSplitsUpdaterRunning() {
    return __isSplitsUpdaterRunning;
  }

  function callSplitsUpdater() {
    __isSplitsUpdaterRunning = true;
    return __splitsUpdater().then(function () {
    }).finally(function () {
      __isSplitsUpdaterRunning = false;
    });
  }

  return {
    isSplitsUpdaterRunning: sinon.spy(isSplitsUpdaterRunning),
    callSplitsUpdater: sinon.spy(callSplitsUpdater),

    __resolveSplitsUpdaterCall(index, changeNumber) {
      splitStorage.setChangeNumber(changeNumber); // update changeNumber in storage
      __splitsUpdaterCalls[index].res(); // resolve previous call
    },
  };
}

function assertKilledSplit(assert, cache, changeNumber, splitName, defaultTreatment) {
  const split = JSON.parse(cache.getSplit(splitName));
  assert.equal(split.killed, true, 'split must be killed');
  assert.equal(split.defaultTreatment, defaultTreatment, 'split must have the given default treatment');
  assert.equal(split.changeNumber, changeNumber, 'split must have the given change number');
}

tape('SplitSync', t => {

  t.test('queueSplitChanges', assert => {

    // setup
    const cache = new SplitCacheInMemory();
    const producer = ProducerMock(cache);

    const splitSync = new SplitSync(cache, producer);
    assert.equal(splitSync.maxChangeNumber, 0, 'inits with not queued changeNumber (maxChangeNumber equals to 0)');

    // assert calling to callSplitsUpdater if isSplitsUpdaterRunning is false
    assert.equal(producer.isSplitsUpdaterRunning(), false);
    splitSync.queueSplitChanges(100);
    assert.equal(splitSync.maxChangeNumber, 100, 'queues changeNumber if it is mayor than storage changeNumber and queue is empty');
    assert.true(producer.callSplitsUpdater.calledOnce, 'calls `callSplitsUpdater` if isSplitsUpdaterRunning is false');

    // assert queueing changeNumber if isSplitsUpdaterRunning is true
    assert.equal(producer.isSplitsUpdaterRunning(), true);
    splitSync.queueSplitChanges(105);
    splitSync.queueSplitChanges(104);
    splitSync.queueSplitChanges(106);
    assert.true(producer.callSplitsUpdater.calledOnce, 'doesn\'t call `callSplitsUpdater` while isSplitsUpdaterRunning is true');
    assert.equal(splitSync.maxChangeNumber, 106, 'queues changeNumber if it is mayor than currently queued changeNumber and storage changeNumber');

    // assert calling to callSplitsUpdater if previous call is resolved and a new changeNumber in queue
    producer.__resolveSplitsUpdaterCall(0, 100);
    setTimeout(() => {
      assert.true(producer.callSplitsUpdater.calledTwice, 'recalls `callSplitsUpdater` if isSplitsUpdaterRunning is false and queue is not empty');
      assert.equal(splitSync.maxChangeNumber, 106, 'changeNumber stays queued until `callSplitsUpdater` is settled');

      // assert dequeueing changeNumber
      producer.__resolveSplitsUpdaterCall(1, 106);
      setTimeout(() => {
        assert.true(producer.callSplitsUpdater.calledTwice, 'doesn\'t call `callSplitsUpdater` while queues is empty');
        assert.equal(splitSync.maxChangeNumber, 0, ' dequeues changeNumber once `callSplitsUpdater` is resolved');

        assert.end();
      });
    });
  });

  t.test('killSplit', assert => {
    // setup
    const cache = new SplitCacheInMemory();
    cache.addSplit('lol1', '{ "name": "something"}');
    cache.addSplit('lol2', '{ "name": "something else"}');

    const producer = ProducerMock(cache);
    const splitSync = new SplitSync(cache, producer);

    // assert calling to `callSplitsUpdater` and `killLocally`, if changeNumber is new
    splitSync.killSplit(100, 'lol1', 'off');
    assert.equal(splitSync.maxChangeNumber, 100, 'queues changeNumber if it is mayor than storage changeNumber and queue is empty');
    assert.true(producer.callSplitsUpdater.calledOnce, 'calls `callSplitsUpdater` if isSplitsUpdaterRunning is false');
    assertKilledSplit(assert, cache, 100, 'lol1', 'off');

    // assert not calling to `callSplitsUpdater` and `killLocally`, if changeNumber is old
    producer.__resolveSplitsUpdaterCall(0, 100);
    setTimeout(() => {
      splitSync.killSplit(90, 'lol1', 'on');
      assert.equal(splitSync.maxChangeNumber, 0, 'doesn\'t queue changeNumber if it is minor than storage changeNumber');
      assert.true(producer.callSplitsUpdater.calledOnce, 'doesn\'t call `callSplitsUpdater`');
      assertKilledSplit(assert, cache, 100, 'lol1', 'off'); // calling `killLocally` makes no effect

      assert.end();
    });
  });

});