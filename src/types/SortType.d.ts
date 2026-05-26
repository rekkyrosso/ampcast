type SortType =
    | '' // default sort
    | 'number' // including dates
    | 'title' // title text (e.g. ignore leading "The")
    | 'locale'; // use `localeCompare`

export default SortType;
