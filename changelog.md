# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keepa Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [Unreleased](https://github.com/purecloudlabs/softphone-vendor-headsets/compare/v2.0.0...HEAD)
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
