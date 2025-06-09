import SortParams from './SortParams';

export default interface MediaListSort {
    readonly sortOptions: Record<string, string>;
    readonly defaultSort: SortParams;
}
