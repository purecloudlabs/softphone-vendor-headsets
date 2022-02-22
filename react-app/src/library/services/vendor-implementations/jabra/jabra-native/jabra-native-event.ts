import { JabraNativeEventNames } from './jabra-native-events';

export interface JabraNativeEvent {
  eventName?: string;
  value?: boolean;
  hidInput?: string;
}
