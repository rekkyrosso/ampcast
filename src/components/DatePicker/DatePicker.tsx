import React, {useCallback, useEffect, useState} from 'react';
import './DatePicker.scss';

export interface DatePickerProps {
    value?: number;
    min?: number;
    max?: number;
    onSelect?: (value: number) => void;
}

interface DatePickerOption {
    value: number;
    text: string | number;
    disabled?: boolean;
}

export default function DatePicker({
    min = 0,
    max = getMaxDate(),
    value = max,
    onSelect,
}: DatePickerProps) {
    const [year, setYear] = useState(() => new Date(value).getFullYear());
    const [month, setMonth] = useState(() => new Date(value).getMonth());
    const [day, setDay] = useState(() => new Date(value).getDate());
    const years = useYears(min, max);
    const months = useMonths(year, min, max);
    const days = useDays(month, year, min, max);

    useEffect(() => {
        const time = new Date(year, month, day).valueOf();
        onSelect?.(Math.min(Math.max(time, min), max));
    }, [onSelect, year, month, day, min, max]);

    const handleYearChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setYear(Number(event.target.value));
    }, []);

    const handleMonthChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setMonth(Number(event.target.value));
    }, []);

    const handleDayChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setDay(Number(event.target.value));
    }, []);

    return (
        <div className="date-picker">
            <select className="date-picker-year" onChange={handleYearChange}>
                {years.map(({value, text}) => (
                    <option value={value} key={value}>
                        {text}
                    </option>
                ))}
            </select>
            <select className="date-picker-month" onChange={handleMonthChange}>
                {months.map(({value, text, disabled}) => (
                    <option value={value} disabled={disabled} key={`${year}-${value}`}>
                        {text}
                    </option>
                ))}
            </select>
            <select className="date-picker-day" onChange={handleDayChange}>
                {days.map(({value, text, disabled}) => (
                    <option value={value} disabled={disabled} key={`${year}-${month}-${value}`}>
                        {text}
                    </option>
                ))}
            </select>
        </div>
    );
}

function useYears(min: number | string, max: number | string): DatePickerOption[] {
    const [years, setYears] = useState<DatePickerOption[]>([]);

    useEffect(() => {
        const years: DatePickerOption[] = [];
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const minYear = minDate.getFullYear();
        let year = maxDate.getFullYear();
        while (year >= minYear) {
            years.push({value: year, text: year});
            year--;
        }
        setYears(years);
    }, [min, max]);

    return years;
}

const monthNames = (() => {
    const applyFormat = new Intl.DateTimeFormat(navigator.language, {month: 'short'}).format;
    return [...Array(12).keys()].map((month) => applyFormat(new Date(2022, month, 2)));
})();

function useMonths(year: number, min: number | string, max: number | string): DatePickerOption[] {
    const [months, setMonths] = useState<DatePickerOption[]>([]);

    useEffect(() => {
        const months: DatePickerOption[] = [];
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const minMonth = year === minDate.getFullYear() ? minDate.getMonth() : 0;
        let month = year === maxDate.getFullYear() ? maxDate.getMonth() : 11;
        while (month >= minMonth) {
            months.push({value: month, text: monthNames[month]});
            month--;
        }
        setMonths(months);
    }, [year, min, max]);

    return months;
}

function useDays(
    month: number,
    year: number,
    min: number | string,
    max: number | string
): DatePickerOption[] {
    const [days, setDays] = useState<DatePickerOption[]>([]);

    useEffect(() => {
        const days: DatePickerOption[] = [];
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const minDay =
            year === minDate.getFullYear() && month === minDate.getMonth() ? minDate.getDate() : 1;
        let day =
            year === maxDate.getFullYear() && month === maxDate.getMonth()
                ? maxDate.getDate()
                : new Date(year, month + 1, 0).getDate();
        while (day >= minDay) {
            days.push({value: day, text: day});
            day--;
        }
        setDays(days);
    }, [month, year, min, max]);

    return days;
}

function getMaxDate(): number {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).valueOf();
}
