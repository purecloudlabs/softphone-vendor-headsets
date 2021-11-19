export interface JabraRequest {
    jabraPermissionRequested: WebHidPermission;
}

export interface WebHidPermission {
    webHidPairing: Function
}