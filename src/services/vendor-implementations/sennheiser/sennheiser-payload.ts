import { SennheiserEvents } from './sennheiser-events';
import { SennheiserEventTypes } from './sennheiser-event-types';

export interface SennheiserPayload {
  Event: SennheiserEvents;
  EventType: SennheiserEventTypes;
  CallID?: number;
  SPName?: string;
  SPIconImage?: string;
  RedialSupport?: 'Yes' | 'No';
  OffHookSupport?: 'Yes' | 'No';
  MuteSupport?: 'Yes' | 'No';
  DNDOption?: 'Yes' | 'No';
}
