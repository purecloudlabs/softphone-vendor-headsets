import { PlantronicsCallEvents } from "./plantronics-call-events";

const responses = {
    CallServices: {

        AnswerCall: {
            default: {
                Description: 'Answered Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.CallInProgress]
            }
        },

        CallManagerState: {
            default: {
                Description: 'Call Manager State',
                Result: {
                    CallOnHold: 0,
                    Calls: '',
                    HasActiveCall: false
                },
                Type: 9,
                Type_Name: 'CallManagerState',
                isError: false
            },

            pendingIncomingCall: {
                Description: 'Call Manager State',
                Result: {
                    CallOnHold: 0,
                    Calls: [
                        {
                            CallId: 411145734,
                            IsActive: false,
                            SessionId: '5b9a53e5-6981-465c-9ffd-6483cb088d78',
                            Source: 'genesys-cloud-headset-library'
                        }
                    ],
                    HasActiveCall: false
                },
                Type: 9,
                Type_Name: 'CallManagerState',
                isError: false
            },

            callsInProgress: {
                Description: 'Call Manager State',
                Result: {
                    CallOnHold: 1,
                    Calls: [
                        {
                            CallId: 411145734,
                            IsActive: false,
                            Session: '5b9a53e5-6981-465c-9ffd-6483cb088d78',
                            Source: 'genesys-cloud-headset-library'
                        },
                        {
                            CallId: 437541114,
                            IsActive: true,
                            Session: '87d880bc-3846-dff9-c564-18965e35a9b5',
                            Source: 'genesys-cloud-headset-library'
                        }
                    ],
                    HasActiveCall: true
                },
                Type: 9,
                Type_Name: 'CallManagerState',
                isError: false
            },

            errorState: {
                handled: true,
                Description: '',
                Err: {
                    Description: 'An error occurred',
                    Error_Code: 0,
                    Type: 5
                },
                Type: 1,
                Type_Name: 'Error',
                isError: true,
            }
        },

        IncomingCall: {
            default: {
                Description: 'Incoming Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.CallRinging]
            }
        },

        OutgoingCall: {
            default: {
                Description: 'Outgoing Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.CallInProgress]
            }
        },

        TerminateCall: {
            default: {
                Description: 'Terminate Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.CallEnded, PlantronicsCallEvents.CallIdle]
            }
        },

        MuteCall: {
            mute: {
                Description: 'Mute Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.Mute]
            },
            unmute: {
                Description: 'Mute Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.Unmute]
            },
            errorState: {
                handled: true,
                Description: '',
                Err: {
                    Description: 'An error occurred',
                    Error_Code: 0,
                    Type: 5
                },
                Type: 1,
                Type_Name: 'Error',
                isError: true,
            }
        },

        HoldCall: {
            default: {
                Description: 'Hold Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false
            }
        },

        ResumeCall: {
            default: {
                Description: 'Resume Call',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false,
                _triggersEvents: [PlantronicsCallEvents.CallInProgress]
            }
        }
    },

    DeviceServices: {

        Info: {
            default: {
                Description: 'Active Device Info',
                Result: {
                    BaseFirmwareVersion: '1307',
                    BaseSerialNumber: '5f3197ffc23dac4d94de50193e4ea3d2',
                    BluetoothFirmwareVersion: '0',
                    DevicePath: 'HID_Device:vid_047f_pid_02f7_lid_200000_mi_64_mo_64_mf_03_pu_05_pup_11',
                    HeadsetSerialNumber: '8f9228276052354290133e68c6618dec',
                    InternalName: 'Cydoemus 2',
                    IsAttached: true,
                    ManufacturerName: 'Plantronics',
                    ProductId: 759,
                    ProductName: 'Plantronics BT600',
                    RemoteFirmwareVersion: '77',
                    SerialNumber: '5f3197ffc23dac4d94de50193e4ea3d2',
                    USBVersionNumber: '1307',
                    Uid: 'df50e9f8775e2c90c4c7bfe932817424',
                    VendorId: 1151
                },
                Type: 4,
                Type_Name: 'DeviceInfo',
                isError: false
            },
            errorState: {
                Description: '',
                Err: {
                    Description: 'An error occurred',
                    Error_Code: 0,
                    Type: 5
                },
                Type: 1,
                Type_Name: 'Error',
                isError: true,
            }
        }
    },

    SessionManager: {

        IsActive: {
            default: {
                Description: 'Is Active',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false
            },
            errorState: {
                Description: '',
                Err: {
                    Description: 'Test Error',
                    Error_Code: 0,
                    Type: 5
                },
                Type: 1,
                Type_Name: 'Error',
                isError: false
            }
        },

        Register: {
            default: {
                Description: '',
                Err: {
                    Description: 'Plugin exists',
                    Error_Code: 0,
                    Type: 5
                },
                Type: 1,
                Type_Name: 'Error',
                isError: true,
                _triggersEvents: [PlantronicsCallEvents.CallIdle]
            },
            errorState: {
                Description: '',
                Err: {
                    Description: 'Test Error',
                    Error_Code: 0,
                    Type: 5
                },
                Type: 1,
                Type_Name: 'Error',
                isError: true,
                // _triggerEvents: [PlantronicsCallEvents.CallIdle]
            }
        }
    },

    UserPreference: {

        SetDefaultSoftPhone: {
            default: {
                Description: 'setDefaultSoftphone',
                Result: true,
                Type: 2,
                Type_Name: 'Bool',
                isError: false
            }
        }
    }
};

export default responses;
