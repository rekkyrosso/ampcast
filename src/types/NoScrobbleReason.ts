const enum NoScrobbleReason {
    None = 0,
    ScrobblingDisabled = 1,
    TooShort = 2,
    TooLong = 3, // Not used
    InvalidType = 99,
    // Fixable
    NotEnoughMetadata = 101,
    MetadataNotVerified = 102,
    DisabledByService = 201,
    DisabledByStation = 202,
    DisabledByTrack = 901,
}

export default NoScrobbleReason;
