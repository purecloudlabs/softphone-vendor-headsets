import { IDevice } from "@gnaudio/jabra-js";
import { Observable, Subject } from "rxjs";

export class MockJabraSdk {
  deviceList: Observable<IDevice[]>;

  _deviceListSub: Subject<IDevice[]>;

  constructor (subject: Subject<IDevice[]>) {
    this._deviceListSub = subject;
    this.deviceList = this._deviceListSub.asObservable();
  }
}