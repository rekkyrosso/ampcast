export type DateRangePeriod =
    | 'all-time'
    | 'this-year'
    | 'this-month'
    | 'this-week'
    | 'year'
    | 'month';

export default interface DateRange {
    period: DateRangePeriod;
    year?: number;
    month?: number; // 1-12
}
