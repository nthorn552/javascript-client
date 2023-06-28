import EventEmitter from 'events';
import { getFetch } from '../platform/getFetch/node';
import { getEventSource } from '../platform/getEventSource/node';
import { getOptions } from '../platform/request/options/node';
import { NodeSignalListener } from '@nthorn-splitio/splitio-commons/src/listeners/node';
import { now } from '@nthorn-splitio/splitio-commons/src/utils/timeTracker/now/node';

export const platform = {
  getOptions,
  getFetch,
  getEventSource,
  EventEmitter,
  now
};

export const SignalListener = NodeSignalListener;
