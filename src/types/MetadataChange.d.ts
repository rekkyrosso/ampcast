import MediaObject from './MediaObject';

export default interface MetadataChange<T extends MediaObject> {
    readonly match: (object: T) => boolean;
    readonly values: Partial<T>;
}
