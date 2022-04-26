import { SennheiserEvents } from './sennheiser-events';
import { SennheiserEventTypes } from './sennheiser-event-types';

export interface SennheiserPayload {
  CallID?: string;
  DNDOption?: 'Yes' | 'No';
  Event?: SennheiserEvents;
  EventType?: SennheiserEventTypes;
  HeadsetName?: string;
  HeadsetType?: string;
  MuteSupport?: 'Yes' | 'No';
  OffHookSupport?: 'Yes' | 'No';
  RedialSupport?: 'Yes' | 'No';
  ReturnCode?: number;
  SPName?: string;
  SPIconImage?: string;
}
