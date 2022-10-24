import {useEffect, useState} from 'react';
import {DateRangePeriod} from 'types/DateRange';

export interface PeriodOrYear {
    value: Exclude<DateRangePeriod, 'year' | 'month'> | number;
    text: string;
}

export default function usePeriodOrYear(startAt: number) {
    const [values, setValues] = useState<PeriodOrYear[]>([]);

    useEffect(() => {
        const values: PeriodOrYear[] = [
            {value: 'all-time', text: '(all time)'},
            {value: 'this-year', text: '(this year)'},
            {value: 'this-month', text: '(this month)'},
            {value: 'this-week', text: '(this week)'},
        ];
        const startYear = new Date(startAt * 1000).getUTCFullYear();
        let year = new Date().getUTCFullYear();
        while (year >= startYear) {
            values.push({value: year, text: String(year)});
            year--;
        }
        setValues(values);
    }, [startAt]);

    return values;
}
