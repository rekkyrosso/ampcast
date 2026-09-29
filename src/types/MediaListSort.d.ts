import {Field} from './MediaListLayout';
import SortParams from './SortParams';

// Fields that are hidden in the result but are still sortable.
export type HiddenField = 'dateAdded' | 'starred_at';

export type SortField = Field | HiddenField;

export default interface MediaListSort {
    readonly sortOptions?: Partial<Record<SortField, string>>;
    readonly defaultSort: SortParams;
}
