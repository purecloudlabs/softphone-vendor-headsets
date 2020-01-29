import { JabraNativeEventNames } from './jabra-native-events';

export interface JabraNativeEvent {
  eventName?: string;
  value?: JabraNativeEventNames;
  hisInput?: boolean;
}
