import MediaObject from './MediaObject';

export default interface MetadataChange<T extends MediaObject> {
    readonly match: (object: MediaObject) => boolean;
    readonly values: Partial<T>;
}
