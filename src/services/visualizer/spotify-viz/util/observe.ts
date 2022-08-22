export function isPrimitive(val: any): boolean {
    const type = typeof val;
    return val == null || (type != 'object' && type != 'function');
}

/**
 * @function Observe – Returns a Proxy allowing mutation observation on objects.
 * @param {Object} target – Object to observe.
 *
 * NOTE: Doesn't do deep watching. Any nested objects need to be wrapped as well.
 *
 * const obj = Observe({
 *   foo: 'bar'
 * })
 *
 * Watch all keys:
 * obj.watch((val, old) => console.log(val, old))
 *
 * Watch single key:
 * obj.watch('foo', (val, old) => console.log(val, old))
 *
 * obj.foo = 'lmao'
 * // => 'lmao', 'bar'
 */

export type Observable<T> = T & {watch: (key: keyof T, callback: Function) => void};

export default function Observe<T>(target: T) {
    const _target = Object.seal({...target});

    /** Store observers for the entire object. */
    const _observers: Record<string, Function[]> = {
        __all__: [],
    };

    /** Store observers for individual keys. */
    for (const key in _target) {
        _observers[key] = [];
    }

    /** Hijack the `set` method for sweet interception action. */
    const traps = {
        set(obj: any, key: string, val: any) {
            let old: any;

            if (isPrimitive(obj[key])) {
                old = obj[key];
            } else if (Array.isArray(obj[key])) {
                old = [...obj[key]];
            } else {
                old = {...obj[key]};
            }

            obj[key] = val;

            if (_observers[key]) {
                _observers[key].map((observer) => observer(val, old));
                _observers.__all__.map((observer) => observer(val, old));
            }

            return true;
        },
    };

    return new Proxy(
        {
            ..._target,
            watch(key: string | Function, callback: Function) {
                /** Watch a single key. */
                if (typeof key === 'string') {
                    if (key in _observers) {
                        _observers[key].push(callback);
                    }
                }

                /** Watch entire object. */
                if (typeof key === 'function') {
                    _observers.__all__.push(key);
                }
            },
        },
        {
            set: traps.set,
        }
    );
}
