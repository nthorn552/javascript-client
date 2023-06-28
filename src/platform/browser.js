import { EventEmitter } from './EventEmitter';
import { getFetch } from '../platform/getFetch/browser';
import { getEventSource } from '../platform/getEventSource/browser';
import { BrowserSignalListener } from '@nthorn-splitio/splitio-commons/src/listeners/browser';
import { now } from '@nthorn-splitio/splitio-commons/src/utils/timeTracker/now/browser';

export const platform = {
  getFetch,
  getEventSource,
  EventEmitter,
  now
};

export const SignalListener = BrowserSignalListener;
