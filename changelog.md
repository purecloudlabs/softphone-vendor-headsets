# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keepa Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [Unreleased](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.5.0...HEAD)
## Fixed
* [STREAM-73](https://inindca.atlassian.net/browse/STREAM-73) - fix for issue where Sennheiser/EPOS devices maintained a mute state when starting a new call
* [STREAM-74](https://inindca.atlassian.net/browse/STREAM-73) - fix for issue where the WebHID permission modal popped up constantly for Jabra

# [v2.5.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.4.5...v2.5.0)
## Added
* [no-jira] Support added for two new vendors VBeT and CyberAcoustics

# [v2.4.5](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.4.4...v2.4.5)
## Fixed
* [no-jira] Fixed issue around Jabra persisting a value between calls causing issues

# [v2.4.4](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.4.3...v2.4.4)
## Fixed
* [no-jira] Fix issue around plantronics unregistering during headset orchestration causing loss of call controls

# [v2.4.3](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.4.1...v2.4.3)
## fixed
* [no-jira] Update uuid to v9.0.1
* [PCM-2224](https://inindca.atlassian.net/browse/PCM-2224) - make jabra multi call slightly better
* [PCM-2224](https://inindca.atlassian.net/browse/PCM-2224) - Allow silent fail of rejectCall with flag; made resetHeadsetStateForCall rejectCall by default since most vendors do that anyway

# [v2.4.1](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.4.0...v2.4.1)
* [PCM-2224](https://inindca.atlassian.net/browse/PCM-2224) - Allow silent fail of rejectCall with flag

# [v2.4.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.3.3...v2.4.0)
## Fixed
* [PCM-2252](https://inindca.atlassian.net/browse/PCM-2252) - Fix double hangup with jabra native and concurrent calls.

## Added
* [PCM-2227](https://inindca.atlassian.net/browse/PCM-2227) - add deviceIsSupported fn to headset

# [v2.3.3](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.3.2...v2.3.3)
## Fixed
* [PCM-2184](https://inindca.atlassian.net/browse/PCM-2184) - Fix snyk vuln: utils

# [v2.3.2](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.3.1...v2.3.2)
## Fixed
* [PCM-2159](https://inindca.atlassian.net/browse/PCM-2159) - Fixed various issues around state, primarily with plantronics headsets

# [v2.3.1](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.3.0...v2.3.1)
## Fixed
* [SERVOPS-33064](https://inindca.atlassian.net/browse/SERVOPS-33064) - Fixed issue where Jabra Native overwrites CEF registration, preventing the use of external links to place call

# [v2.3.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.2.1...v2.3.0)
## Added
* Functionality for new Vendor: Yealink

# [v2.2.1](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.2.0...v2.2.1)
## Fixed
* [PCM-2007](https://inindca.atlassian.net/browse/PCM-2007) - Fixed issue with switching devices during active call
* [PCM-2016](https://inindca.atlassian.net/browse/PCM-2016) - Remove boostrap/jquery dependency

# [v2.2.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.1.0...v2.2.0)
## Fixed
* [PCM-1974](https://inindca.atlassian.net/browse/PCM-1974) - Added in logic to properly handle auto answer scenarios
* [PCM-1975](https://inindca.atlassian.net/browse/PCM-1975) - Added in logic to properly handle auto answer scenarios

# [v2.1.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.0.2...v2.1.0)
## Added
* [PCM-1965](https://inindca.atlassian.net/browse/PCM-1965) - Allow passing in the app name to the headset library for registration purposes

# [v2.0.2](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.0.1...v2.0.2)
## Fixed
* Fixed issue with Jabra conversation IDs

# [v2.0.1](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.0.0...v2.0.1)
## Fixed
* Added line in for Plantronics to ensure a rejected call is terminated on the device as well

# [v2.0.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v1.0.1...v2.0.0)
## Breaking Changes
* The `deviceMuteChanged` event has been removed. Please use the `deviceMuteStatusChanged` event.
## Added
* [PCM-1903](https://inindca.atlassian.net/browse/PCM-1903) - Add headset state management

# [v1.0.1](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v1.0.0...v1.0.1)
### Fixed
* [no-jira] - Fixed issue if no device label is supplied; Delayed initialization of Jabra SDK

# [v1.0.0](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v0.1.3...v1.0.0)
Major version bump

# [v0.1.3](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v0.1.2...v0.1.3)
### Fixed
* [PCM-1668](https://inindca.atlassian.net/browse/PCM-1668) - Put string related responsibilities in the library rather than consuming app; fixed test app

# [v0.1.2](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v0.1.1...v0.1.2)
### Added
* [PCM-1668](https://inindca.atlassian.net/browse/PCM-1668) - Added logic to better accommodate reject call functionality

### Fixed
* [PCM-1668](https://inindca.atlassian.net/browse/PCM-1668) - Changed how consuming app receives connection status to ensure accuracy

# [v0.1.1](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v0.1.0...v0.1.1)
### Fixed
* [PCM-1668](https://inindca.atlassian.net/browse/PCM-1668) - Updated function within headset library to help with integration into consuming apps

# [v0.1.0](https://github.com/purecloudlabs/softphone-vendor-headsets/tree/d230063938501788fff660924cb1f530c1685499)
### Added
* [PCM-1684](https://inindca.atlassian.net/browse/PCM-1684) - Added logic to now handle Sennheiser's rebranded devices, EPOS.
* [PCM-1667](https://inindca.atlassian.net/browse/PCM-1667) - Completed the work started on the new headset library. Included logic for three vendors: Jabra, Poly/Plantronics and
    Sennheiser/EPOS. Each headset can now use call controls from the device itself
