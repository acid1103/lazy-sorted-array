/**
 * The implementation of
 * [ProxyHandler](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Proxy/handler) which handles
 * interactions between a `SortedArray` and outside code. Specifically, it handles array indexing and length getting and
 * setting.
 * ***
 * **See also**
 * - [Proxy](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Proxy)
 * - [ProxyHandler](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Proxy/handler)
 */
class Handler implements ProxyHandler<SortedArray<any>> {
    /**
     * Checks that the given object is a valid integer. If it is, the integer is returned. Otherwise, `undefined` is
     * returned.
     */
    private static checkInteger(p: any): number | undefined {
        if (typeof p === "symbol") {
            // handle the special case where p is a symbol, since, according to
            // https://www.ecma-international.org/ecma-262/6.0/#sec-tonumber, Number(Symbol) throws a TypeError.
            return undefined;
        }
        const n = Number(p);
        if (!isNaN(n) && Math.floor(n) === n) {
            return n;
        } else {
            return undefined;
        }
    }

    // tslint:disable-next-line: no-empty
    constructor() { }

    /**
     * Intercepts any operation performed on the target `SortedArray` which results in retrieving a value from the 
     * `SortedArray`. Specifically handles the case when trying to index the array, and when accessing the `length`
     * property of the array.
     * ***
     * **See also**
     * [ProxyHandler#get](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Proxy/handler/get)
     */
    public get(target: SortedArray<any>, p: PropertyKey, receiver: any): any {
        const index = Handler.checkInteger(p);
        if (index !== undefined) {
            // the property which is being accessed is an integer, meaning it's an index of the array. this is
            // equivalent to calling target.get(p)
            return target.get(index);
        } else if (p === "length") {
            // the length property is being accessed, so return the inner array's length (we don't actually keep track
            // of the length of the array internally, we let the inner array (SortedArray.array) handle it)
            return Reflect.get(target, "array", receiver).length;
        } else {
            // otherwise, just pass-through
            return Reflect.get(target, p, receiver);
        }
    }

    /**
     * Intercepts any operation performed on the target `SortedArray` which results in setting a value in the 
     * `SortedArray`. Specifically handles the case when trying to set the value of the array and when setting the
     * `length` property of the array.
     * @see https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Proxy/handler/set
     */
    public set(target: SortedArray<any>, p: PropertyKey, value: any, receiver: any): boolean {
        const index = Handler.checkInteger(p);
        if (index !== undefined) {
            // setting an element in a sorted array is an invalid operation
            throw new Error("set is an invalid operation on a sorted array");
        } else if (p === "length") {
            // the length of the SortedArray is being set. as the array must always be capable of being sorted and empty
            // elements get in the way of that, we currently disallow increasing the size of a SortedArray. this is
            // likely to change in the future
            const newLength = Handler.checkInteger(value);
            if (newLength === undefined || newLength < 0) {
                // if value isn't a positive integer, mimic the default behavior for setting the length of arrays
                throw new RangeError("Invalid array length");
            } else {
                // otherwise, set the length of the array if it's less than or equal to the current length of the array
                const array = Reflect.get(target, "array", receiver) as any[];
                if (newLength > array.length) {
                    throw new RangeError("The length of a SortedArray may not be extended");
                } else {
                    array.length = newLength;
                    return true;
                }
            }
        } else {
            // otherwise, pass-through
            return Reflect.set(target, p, value, receiver);
        }
    }
}

/**
 * A SortedArray is a sorted array which sorts lazily. That is, it is an array which keeps all its elements in a
 * specific order, according to some `compareFn`. It performs these sorts only when necessary, as opposed to sorting
 * each element as it's inserted. This is most efficient for arrays which insert frequently and read sparingly.
 * 
 * SortedArrays also sort based on insertion order. If `a` equals `b` according to `compareFn`, and `a` is inserted
 * before `b`, `a` is guaranteed to have a smaller index than `b`.
 * 
 * SortedArrays don't support all the operations Arrays do. Below is a list of unsupported functions:
 *  - push
 *  - concat
 *  - reverse
 *  - unshift
 *  - fill
 *  - copyWithin
 *  - set (i.e., `array[0] = 10`)
 * 
 * Additionally, the following table describes functions with limited functionality.
 * 
 * Operation|Invalid Argument
 * ---------|----------------
 * sort|compareFn
 * splice|items
 * 
 * SortedArrays must maintain full control over the positioning of the elements contained within them. Since the above
 * operations alter the internal state of a SortedArray, they are not supported.
 */
export class SortedArray<T> implements Array<T> {
    /**
     * Container for several utility sorting functions
     */
    public static CompareFunctions = {
        /**
         * Sorts `a` and `b` alphabetically with case sensitivity ('a' > 'A').
         */
        AlphabeticSort: Intl.Collator().compare,
        /**
         * Sorts `a` and `b` alphabetically with case insensitivity ('a' == 'A').
         */
        AlphabeticSortIgnoreCase: (a: string, b: string) =>
            SortedArray.CompareFunctions.AlphabeticSort(String(a).toLowerCase(), String(b).toLowerCase()),
        /**
         * Converts both arguments to strings and compares those strings purely based on the
         * [charCodes](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/String/charCodeAt#Description)
         * comprising each string.
         * 
         * This sort algorithm is equivalent to the algorithm used when calling `Array.sort` with no `compareFn`
         * argument. For more information, see
         * [ECMA-262, 6th Edition § 22.1.3.24.1](https://www.ecma-international.org/ecma-262/6.0/#sec-sortcompare).
         */
        DefaultSort: (a: any, b: any) => {
            // implementation of https://www.ecma-international.org/ecma-262/6.0/#sec-sortcompare

            if (a === b) { return 0; }
            if (a === undefined) {
                return 1;
            } else if (b === undefined) {
                return -1;
            }

            // this will error if a or b are Symbols, but this matches the functionality of most browsers and node.
            a = String(a); b = String(b);
            if (a === b) { return 0; } // check again now that they're strings
            if (a.length === 0) { return -1; }
            if (b.length === 0) { return 1; }

            let i = 0;
            const len = Math.min(a.length, b.length);
            let ai; let bi; let compare;
            do {
                ai = a.charCodeAt(i);
                bi = b.charCodeAt(i);
                compare = ai - bi;
                i++;
            } while (compare === 0 && i < len);

            if (compare === 0) {
                // we don't have to worry about the a.length === b.length case because that would imply the strings are
                // identical, meaning the (a === b) condition above would have been true.
                return a.length < b.length ? -1 : 1;
            }

            return compare;
        },
        /**
         * Returns a function which sorts `a` and `b` alphabetically with respect to the given locale(s) and option(s).
         * 
         * See [Intl.Collator](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Collator) for details
         * about `locales` and `options`
         */
        LocaleAlphabeticSort: (locales?: string | string[], options?: Intl.CollatorOptions) =>
            Intl.Collator(locales, options).compare,
        /**
         * Sorts `a` and `b` numerically (123 < 321).
         */
        NumericSort: (a: number, b: number) => a - b,
        /**
         * Returns the inverse of `f`. In other words, if `f(a,b) => a < b`, then `SortInverter(f)(a,b) => a > b`.
         */
        // tslint:disable-next-line: only-arrow-functions object-literal-shorthand
        SortInverter: function <U>(f: (a: U, b: U) => number) { return (a: U, b: U) => -f(a, b); },
    };

    private static handler = new Handler();
    [n: number]: T; public length: number;
    private array: Array<SANode<T>>; private sorted: boolean; private insertionCounter: number;
    private sorting: boolean; private originalCompareFn: (a: T, b: T) => number;
    private compareFn: (a: SANode<T>, b: SANode<T>) => number;

    /**
     * Constructs a new `SortedArray`
     * @param compareFn The function used to sort all elements of this array. See `SortedArray.CompareFunctions` for
     * some pre-made utility compare functions. Defaults to `SortedArray.CompareFunctions.DefaultSort`
     * @param elements An array of elements used to populate this `SortedArray`. Defaults to an empty array
     */
    constructor(compareFn?: (a: T, b: T) => number, elements?: T[]) {
        this.insertionCounter = Number.MIN_SAFE_INTEGER;
        if (compareFn === undefined) { compareFn = SortedArray.CompareFunctions.DefaultSort; }
        this.originalCompareFn = compareFn;
        this.compareFn = (a, b) => {
            let compare = this.originalCompareFn(a.obj, b.obj);
            if (compare === 0) { compare = a.index - b.index; }
            return compare;
        };
        if (elements) {
            this.array = this.wrap(elements);
        } else {
            this.array = [];
        }
        this.sorted = false;
        return new Proxy(this, SortedArray.handler);
    }

    // PUBLIC METHODS
    /**
     * Returns the element of this array at the given index
     */
    public get(index: number): T {
        if (index < 0 || index >= this.array.length) { throw this.oob(index); }
        this._sort();
        return this.array[index].obj;
    }
    /**
     * Adds the given items to this array
     */
    public add(...items: T[]): number {
        return this.addAll(items);
    }
    /**
     * Adds all the items in the given array to this array
     */
    public addAll(items: T[]): number {
        this.sorted = false;
        for (const item of items) { this.array.push(this.wrapOne(item)); }
        return this.array.length;
    }
    /**
     * Returns a pure [Array](https://developer.mozilla.org/JavaScript/Reference/Global_Objects/Array) containing all
     * the elements of this array in their sorted order
     */
    public toArray(): T[] {
        this._sort();
        return this.unwrap();
    }
    /**
     * Finds the `nth` entry of the given `obj` in this array. If `exact` is true, finds the `nth` entry of the exact
     * reference passed via `obj`. If the `nth` entry cannot be found, `undefined` is returned.
     * 
     * **Specifications for `n`**
     * 
     * `findNth` works as defined above for all positive `n`. For negative `n` (including `-0`,) indexing begins
     * starting from the **last** object in the array which matches `obj` and advances backwards `-n` times. `n` may
     * also be `undefined`. In this case, the first entry found which which matches `obj` is returned. No guarantee is
     * made about the entry's location relative to other entries which match `obj`.
     * 
     * **Examples**
     * 
     * ```typescript
     * const exact: [number, number] = [3, 1];
     * const array: Array<[number, number]> = [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], exact, exact];
     * // generate a SortedArray whose elements are a copy of array and which sorts its elements via a numerical
     * // comparison of the first (0th) index of each sub-array
     * const sa = new SortedArray((a, b) => a[0] - b[0], array);
     * 
     * // basic functionality
     * sa.findNth([1, 1], 0, false);  // -> { obj: [1, 1], index: 0 }
     * sa.findNth([1, 1], 1, false);  // -> { obj: [1, 2], index: 1 }
     * sa.findNth([1, 1], 2, false);  // -> undefined
     * 
     * // negative n
     * sa.findNth([2, 1], 0, false);  // -> { obj: [2, 1], index: 2 }
     * sa.findNth([2, 1], -0, false); // -> { obj: [2, 3], index: 4 }
     * sa.findNth([2, 1], 1, false);  // -> { obj: [2, 2], index: 3 }
     * sa.findNth([2, 1], -1, false); // -> { obj: [2, 2], index: 3 }
     * 
     * // finding exact objects
     * sa.findNth(exact, 0, true);    // -> { obj: [3, 1], index: 5 }
     * sa.findNth(exact, 1, true);    // -> { obj: [3, 1], index: 6 }
     * sa.findNth(exact, -0, true);   // -> { obj: [3, 1], index: 6 }
     * sa.findNth(exact, -1, true);   // -> { obj: [3, 1], index: 5 }
     * ```
     */
    public findNth(obj: T, n?: number, exact?: boolean): FindResult<T> | undefined {
        this._sort();
        const result = this.searchNth(obj, n, undefined, undefined, exact);
        if (!result.found) {
            return undefined;
        } else {
            return { obj: this.array[result.index].obj, index: result.index };
        }
    }
    /**
     * Finds all elements of this array which match the given `obj`, determined by the compare function given to
     * construct this SortedArray. If `exact` is true, finds all entries of the exact reference passed via `obj`. The
     * order of the elements returned will be in the order in which they were inserted into this array. If there are no
     * elements which match `obj` found within this array, an empty array is returned.
     * 
     * **Examples**
     * 
     * ```typescript
     * const exact: [number, number] = [3, 1];
     * const array: Array<[number, number]> = [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], exact, exact];
     * // generate a SortedArray whose elements are a copy of array and which sorts its elements via a numerical
     * // comparison of the first (0th) index of each sub-array
     * const sa = new SortedArray((a, b) => a[0] - b[0], array);
     * 
     * // not exact
     * sa.findAll([1, 1], false); // -> [{ obj: [1, 1], index: 0 }, { obj: [1, 2], index: 1 }]
     * 
     * // exact
     * sa.findAll(exact, true);   // -> [{ obj: [3, 1], index: 5 }, { obj: [3, 1], index: 6 }]
     * 
     * // doesn't exist
     * sa.findAll([4, 1], false); // -> []
     * ```
     */
    public findAll(obj: T, exact?: boolean): Array<FindResult<T>> {
        this._sort();
        let result;
        if (exact) {
            result = this.searchExact(obj);
        } else {
            result = this.searchAll(obj);
        }
        const map = result.map((v) => ({ obj: this.array[v].obj, index: v }));
        return map;
    }
    /**
     * Finds the elements in this SortedArray which would be nearest to `obj` if `obj` were to be inserted into the
     * array.
     * 
     * Specifically, if there is an element equal to `obj` (according to the compare function used to construct
     * this SortedArray), this function returns an object containing an `eq` property which corresponds to that element.
     * Otherwise, this function returns the elements which would come directly before and directly after (`lt` and `gt`
     * respectively) `obj` if `obj` were to be inserted into the array.
     * 
     * Note: if `obj` would be at an end of this array, `lt` or `gt` will be undefined depending on which end of the
     * array `obj` would be. If this array is of size 0, this function is guaranteed to return
     * `{ lt: undefined, gt: undefined }`.
     */
    public findNearest(obj: T): {
        lt: FindResult<T> | undefined,
        gt: FindResult<T> | undefined,
    } | {
        eq: FindResult<T>,
    } {
        const result = this.search(obj);
        if (result.found) {
            return {
                eq: {
                    index: result.index,
                    obj: this.array[result.index].obj,
                },
            };
        } else {
            let ltIndex;
            let gtIndex;
            if (result.index < 0) {
                ltIndex = -Infinity; // any number < 0 works here
                gtIndex = 0;
            } else if (result.index >= this.array.length) {
                ltIndex = this.array.length - 1;
                gtIndex = Infinity; // any number >= this.array.length works here
            } else {
                // result is in the middle of the array, so we need to determine whether obj would go before or after
                // result, thus giving us the indices for lt and gt.
                const foundObj = this.array[result.index].obj;
                const compare = this.originalCompareFn(obj, foundObj);
                ltIndex = result.index - Number(compare < 0);
                gtIndex = result.index + Number(compare > 0);
            }
            const lt = ltIndex < 0 ? undefined : {
                index: ltIndex,
                obj: this.array[ltIndex].obj,
            };
            const gt = gtIndex >= this.array.length ? undefined : {
                index: gtIndex,
                obj: this.array[gtIndex].obj,
            };
            return { gt, lt };
        }
    }
    /**
     * Removes the given indices from this array and returns an array containing the removed elements.
     */
    public remove(...indices: number[]): T[] {
        return this.removeAll(indices);
    }
    /**
     * Removes all the indices in the given array from this array and returns an array containing the removed elements.
     */
    public removeAll(indices: number[]): T[] {
        this._sort();
        const acc: T[] = [];
        // sort it so we know how the indices of the array are going to change as we're removing elements
        indices.sort((a, b) => a - b);
        for (let i = 0; i < indices.length; i++) {
            // we have to subtract i to correct for the number of elements we've removed
            const index = indices[i] - i;
            if (index < 0 || index >= this.array.length) { throw this.oob(index); }
            acc.push(this.array.splice(index, 1)[0].obj);
        }
        return acc;
    }

    // INTERFACE METHODS
    public toString(): string {
        this._sort();
        const unwrapped = this.unwrap();
        for (let i = 0; i < unwrapped.length; i++) {
            if (unwrapped[i] as any === this) {
                unwrapped[i] = "[Circular]" as unknown as T;
            }
        }
        return unwrapped.toString();
    }
    public toLocaleString(): string {
        this._sort();
        const unwrapped = this.unwrap();
        for (let i = 0; i < unwrapped.length; i++) {
            if (unwrapped[i] as any === this) {
                unwrapped[i] = "[Circular]" as unknown as T;
            }
        }
        return unwrapped.toLocaleString();
    }
    public pop(): T {
        this._sort();
        return this.array.pop().obj;
    }
    /**
     * **Push is an invalid operation on a SortedArray!** Calling this function will result in an error.
     */
    public push(items: any): number {
        throw this.uo("push");
    }
    /**
     * **Concat is an invalid operation on a SortedArray!** Calling this function will result in an error.
     */
    public concat(...items: Array<ConcatArray<T>>): T[];
    public concat(...items: Array<T | ConcatArray<T>>): T[] {
        throw this.uo("concat");
    }
    public join(separator?: string): string {
        this._sort();
        return this.unwrap().join(separator);
    }
    /**
     * **Concat is an invalid operation on a SortedArray!** Calling this function will result in an error.
     * The following would be one way to reverse a SortedArray (assuming `sa` is this SortedArray and `compareFn` is the
     * compare function for this SortedArray):
     * ```typescript
     * const tempArray = sa.toArray();
     * const reverseArray = tempArray.reverse();
     * const inverseCompareFn = SortedArray.CompareFunctions.SortInverter(compareFn);
     * const reverseSortedArray = new SortedArray(inverseCompareFn, reverseArray);
     * ```
     */
    public reverse(): T[] {
        throw this.uo("reverse");
    }
    public shift(): T {
        this._sort();
        return this.array.shift().obj;
    }
    public slice(start?: number, end?: number): T[] {
        this._sort();
        return this.unwrap(this.array.slice(start, end));
    }
    /**
     * Forces this SortedArray to sort. This is useful if changes have been made to some elements of this array
     * which would affect their sort order, as a SortedArray is incapable of detecting (and thus appropriately sorting
     * after) changes to its elements.
     * 
     * **Note: Sort is an invalid operation on a SortedArray when `compareFn` is provided!**
     * 
     * To sort a SortedArray with a different `compareFn` than what it was initiated with, you must first call
     * `SortedArray.toArray()` then sort it with the new `compareFn`. To get a SortedArray with a different `compareFn`,
     * you could do the following (assuming `sa` is this SortedArray and `compareFn` is the *new* compare function you
     * wish for the new SortedArray to use to sort):
     * ```typescript
     * const newSortedArray = new SortedArray(compareFn, sa);
     * ```
     */
    public sort(compareFn?: (a: T, b: T) => number): this {
        if (compareFn) {
            throw new Error("sort is an invalid operation on a sorted array when providing a new compare function");
        }
        this.sorted = false;
        this._sort();
        return this;
    }
    /**
     * @inheritdoc
     * 
     * **Note: Splice is an invalid operation on a SortedArray when `items` is provided!**
     * 
     * @param start 
     * @param deleteCount 
     */
    public splice(start: number, deleteCount?: number): T[];
    public splice(start: number, deleteCount?: number, ...items: T[]): T[] {
        if (items?.length > 0) {
            throw new Error("splice is an invalid operation on a sorted array when providing replacement items");
        }
        this._sort();
        return this.unwrap(this.array.splice(start, deleteCount));
    }
    /**
     * **Unshift is an invalid operation on a SortedArray!** Calling this function will result in an error.
     */
    public unshift(...items: T[]): number {
        throw this.uo("unshift");
    }
    public includes(searchElement: T, fromIndex?: number, toIndex?: number, exact?: boolean): boolean {
        this._sort();
        fromIndex = this.calcTrueIndex(fromIndex);
        toIndex = this.calcTrueIndex(toIndex);
        if (exact) {
            const results = this.searchExact(searchElement, fromIndex, toIndex);
            return results.length > 0;
        } else {
            const results = this.searchNth(searchElement, undefined, fromIndex, toIndex);
            return results.found;
        }
    }
    public indexOf(searchElement: T, fromIndex?: number, toIndex?: number, exact?: boolean): number {
        this._sort();
        fromIndex = this.calcTrueIndex(fromIndex);
        toIndex = this.calcTrueIndex(toIndex);
        if (exact) {
            const results = this.searchExact(searchElement, fromIndex, toIndex);
            if (results.length > 0) {
                return results[0];
            } else {
                return -1;
            }
        } else {
            const results = this.searchNth(searchElement, 0, fromIndex, toIndex);
            if (results.found) {
                return results.index;
            } else {
                return -1;
            }
        }
    }
    public lastIndexOf(searchElement: T, fromIndex?: number, toIndex?: number, exact?: boolean): number {
        this._sort();
        fromIndex = this.calcTrueIndex(fromIndex);
        toIndex = this.calcTrueIndex(toIndex);
        if (exact) {
            const results = this.searchExact(searchElement, fromIndex, toIndex);
            if (results.length > 0) {
                return results[results.length - 1];
            } else {
                return -1;
            }
        } else {
            const results = this.searchNth(searchElement, -0, fromIndex, toIndex);
            if (results.found) {
                return results.index;
            } else {
                return -1;
            }
        }
    }
    public every(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        for (let i = 0; i < this.array.length; i++) {
            if (!callbackfn.call(thisArg, this.array[i].obj, i, array)) { return false; }
        }
        return true;
    }
    public some(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): boolean {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        for (let i = 0; i < this.array.length; i++) {
            if (callbackfn.call(thisArg, this.array[i].obj, i, array)) { return true; }
        }
        return false;
    }
    public forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        for (let i = 0; i < this.array.length; i++) { callbackfn.call(thisArg, this.array[i].obj, i, array); }
    }
    public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        const map = new Array<U>(this.array.length);
        for (let i = 0; i < this.array.length; i++) { map[i] = callbackfn.call(thisArg, this.array[i].obj, i, array); }
        return map;
    }
    public filter(callbackfn: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        const filter = new Array<T>();
        for (let i = 0; i < this.array.length; i++) {
            if (callbackfn.call(thisArg, this.array[i].obj, i, array)) { filter.push(this.array[i].obj); }
        }
        return filter;
    }
    public reduce<U>(
        callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
        initialValue?: U,
    ): U {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 4) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        let value = initialValue;
        for (let i = 0; i < this.array.length; i++) { value = callbackfn(value, this.array[i].obj, i, array); }
        return value;
    }
    public reduceRight<U>(
        callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U,
        initialValue?: U,
    ): U {
        this._sort();
        let array: T[];
        if (callbackfn.length >= 4) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        let value = initialValue;
        for (let i = this.array.length - 1; i >= 0; i--) { value = callbackfn(value, this.array[i].obj, i, array); }
        return value;
    }
    public find(predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any): T {
        this._sort();
        let array: T[];
        if (predicate.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        for (let i = 0; i < this.array.length; i++) {
            if (predicate.call(thisArg, this.array[i].obj, i, array)) { return this.array[i].obj; }
        }
        return undefined;
    }
    public findIndex(predicate: (value: T, index: number, obj: T[]) => boolean, thisArg?: any): number {
        this._sort();
        let array: T[];
        if (predicate.length >= 3) {
            // if callbackfn includes an argument for array, we have to unwrap and provide the array in terms of T
            array = this.unwrap();
        }
        for (let i = 0; i < this.array.length; i++) {
            if (predicate.call(thisArg, this.array[i].obj, i, array)) { return i; }
        }
        return -1;
    }
    /**
     * **Fill is an invalid operation on a SortedArray!** Calling this function will result in an error.
     */
    public fill(value: T, start?: number, end?: number): this {
        throw this.uo("fill");
    }
    /**
     * **CopyWithin is an invalid operation on a SortedArray!** Calling this function will result in an error.
     */
    public copyWithin(target: number, start: number, end?: number): this {
        throw this.uo("copyWithin");
    }
    public [Symbol.iterator](): IterableIterator<T> {
        this._sort();
        const generator = function*() {
            for (const item of this.array) { yield item.obj; }
        };
        return generator.call(this);
    }
    public entries(): IterableIterator<[number, T]> {
        this._sort();
        const generator = function*() {
            for (let i = 0; i < this.array.length; i++) { yield [i, this.array[i].obj]; }
        };
        return generator.call(this);
    }
    public keys(): IterableIterator<number> {
        this._sort();
        const generator = function*() {
            for (let i = 0; i < this.array.length; i++) { yield i; }
        };
        return generator.call(this);
    }
    public values(): IterableIterator<T> {
        return this[Symbol.iterator]();
    }
    public [Symbol.unscopables](): {
        copyWithin: boolean;
        entries: boolean;
        fill: boolean;
        find: boolean;
        findIndex: boolean;
        keys: boolean;
        values: boolean;
    } {
        // Array.prototype[Symbol.unscopables] is not a function, despite tsc insisting that it is.
        // (See https://github.com/microsoft/TypeScript/issues/34610)
        return Array.prototype[Symbol.unscopables] as unknown as {
            copyWithin: boolean;
            entries: boolean;
            fill: boolean;
            find: boolean;
            findIndex: boolean;
            keys: boolean;
            values: boolean;
        };
    }

    // PRIVATE METHODS
    /**
     * Sorts this array if it isn't already sorted
     */
    private _sort() {
        if (!this.sorted && !this.sorting) {
            // fix for circular array causing max call stack if sort function contains a call to toString (#5)
            this.sorting = true;
            this.array.sort(this.compareFn);
            this.sorting = false;
        }
        this.sorted = true;
    }
    /**
     * If `items` is provided, an array of the `obj` property of each item in `items` is returned. Otherwise, the same
     * is done for `this.array`.
     */
    private unwrap(items?: Array<SANode<T>>) {
        if (items) {
            return items.map((v) => v.obj);
        } else {
            return this.array.map((v) => v.obj);
        }
    }
    /**
     * Returns an array of `SANode`s where the `obj` property is the associated object in `objs` and the `index`
     * property is the current `this.insertionCounter` value for that object. For more information on
     * `this.insertionCounter`, see `SortedArray.wrapOne`.
     */
    private wrap(objs: T[]) {
        return objs.map((obj) => this.wrapOne(obj));
    }
    /**
     * Wraps an object into an `SANode`, giving it an index which will result in correct insertion order. This is
     * accomplished by tracking the number of items seen by this `SortedArray` by using `this.insertionCounter`. For
     * each object wrapped, `this.insertionCounter` is incremented by one. This feature can be skipped by setting
     * `emulateEndInsertion` to true. If `emulateEndInsertion` is true, `emulateEndInsertionIncrement` can be used to
     * wrap multiple emulated items and emulate their indices correctly.
     * 
     * Note: if `this.insertionCounter` is at least `Number.MAX_SAFE_INTEGER` objects, this function automatically calls
     * `this.reduceInsertionOrders` to ensure `this.insertionCounter` will always provide an index for an element whose
     * insertion will place it at the end of this `SortedArray`.
     */
    private wrapOne(obj: T, emulateEndInsertion?: boolean, emulateEndInsertionIncrement?: number) {
        // get the effective index of this (potentially emulated) wrap
        let index = this.insertionCounter + (emulateEndInsertionIncrement ?? 0);
        if (!emulateEndInsertion) {
            // if we're not emulating, increment this.elementSeen and ensure we're still within safe bounds
            this.insertionCounter++;
            if (this.insertionCounter >= Number.MAX_SAFE_INTEGER) {
                // XXX: it's unfortunate that we have to do this. a better way of tracking insertion order would be
                // the preferred fix.

                // we're not within safe bounds, so reduce.
                // 
                // also, note that according to http://www.ecma-international.org/ecma-262/6.0/#sec-array-exotic-objects
                // an array cannot have a length of more than 2^32 - 1 (4294967295) , which is much less than the
                // 2 * Number.MAX_SAFE_INTEGER (18014398509481982) that would be required to make reduction impossible,
                // thus a reduction is always possible.
                this.reduceInsertionOrders();
                // we need to reassign index after reducing.
                index = this.insertionCounter++;
            }
        }
        // construct and return the node
        return { obj, index };
    }
    /**
     * Iterates through each element of this SortedArray and calculates the minimum necessary `SANode` index to maintain
     * insertion order. This is to ensure `this.insertionCounter` never overflows.
     * 
     * Impl note: this function has complexity of `2*O(n) + O(Array.sort(n))`. `O(Array.sort(n))` is likely roughly
     * `O(n*log(n))`.
     */
    private reduceInsertionOrders() {
        const copy = this.array.slice(); // clone the array
        copy.sort((a, b) => a.index - b.index); // sort the elements by their insertion index
        this.insertionCounter = Number.MIN_SAFE_INTEGER; // reset the insertion counter
        for (const element of copy) {
            element.index = this.insertionCounter++; // calculate the minimum effective insertion index for each element
        }
    }
    /**
     * Searches within `min` and `max` (or 0 and `length - 1` respectively if `min` and `max` are falseish) for an
     * object which "equals" (according to `originalCompareFn`) `obj`.
     */
    private search(obj: T, min?: number, max?: number) {
        if (min !== undefined) {
            if (!isFinite(min) || min < 0 || Math.floor(min) !== min) {
                throw new Error("min must be a positive finite integer!");
            }
        } else {
            min = 0;
        }
        if (max !== undefined) {
            if (!isFinite(max) || max < 0 || Math.floor(max) !== max || max > this.array.length) {
                throw new Error(
                    "max must be a positive finite integer and must not be larger than the length of this array!");
            }
        } else {
            max = this.array.length - 1;
        }
        if (this.array.length === 0) { return { index: 0, found: false }; }

        this._sort();
        const searchObj = this.wrapOne(obj, true);
        let cur = Math.floor(max / 2);
        while (max >= min) {
            const compare = this.originalCompareFn(searchObj.obj, this.array[cur].obj);
            if (compare === 0) {
                return { index: cur, found: true };
            } else if (compare < 0) {
                max = cur - 1;
            } else if (compare > 0) {
                min = cur + 1;
            } else {
                throw new Error("Compare function cannot return NaN");
            }
            cur = Math.floor((min + max) / 2);
        }
        return { index: cur, found: false };
    }
    /**
     * Search within the indices of `min` and `max` for all objects which ("equal" `obj` according to
     * `originalCompareFn` if `exact` is falseish) or (strictly equal `obj` if `exact` is true). Of those results found,
     * the `nth` index is returned. `n` can be negative and performs is a special way in that case. For documentation on
     * that special case, see `SortedArray.findNth`.
     */
    private searchNth(obj: T, n: number, min?: number, max?: number, exact?: boolean) {
        let direction;
        let offset;
        if (n !== undefined) {
            direction = Math.sign(n) || (Object.is(-0, n) ? -1 : 1);
            offset = n;
        }

        if (exact) {
            let result;
            // currently none of the public functions allow n to be undefined. if that functionality is desired in the
            // future, uncomment the below and of course make n optional
            // if (n === undefined) {
            //     result = this.searchExact(obj, min, max);
            //     if (result.length > 0) {
            //         return { index: result[0], found: true };
            //     } else {
            //         // see "there's no real meaningful index" comment below. the same applies here.
            //         return { index: -1, found: false };
            //     }
            // }
            result = this.searchExact(obj, min, max);
            if (offset >= result.length) {
                // there's no real meaningful index which can be provided in this situation. the entries in result
                // aren't guaranteed to be sequential, so we can't simply return an offset into the array. thus, -1 is
                // returned.
                return { index: -1, found: false };
            }
            const index = (direction === 1 ? 0 : result.length - 1) + offset;
            return { index: result[index], found: true };
        } else {
            const result = this.search(obj, min, max);
            if (!result.found || n === undefined) { return result; }
            let index = result.index;
            if (direction === -1) {
                // find the last element equal to obj
                // tslint:disable-next-line: curly
                for (
                    ++index;
                    index < this.array.length && this.originalCompareFn(obj, this.array[index].obj) === 0;
                    index++
                );
                index = index + offset - 1;
            } else {
                // find the first element equal to obj
                // tslint:disable-next-line: curly
                for (
                    --index;
                    index >= 0 && this.originalCompareFn(obj, this.array[index].obj) === 0;
                    index--
                );
                index = index + offset + 1;
            }
            // if the calculated index is within the bounds of this array and the object at that index equals the object
            // given to us, then we've found the nth object.
            const found =
                0 <= index && index < this.array.length && this.originalCompareFn(obj, this.array[index].obj) === 0;
            return { index, found };
        }
    }
    /**
     * Searches within the indices `min` and `max` for and returns the indices for all objects which exactly equal `obj`
     * via reference equal (the === operator)
     */
    private searchExact(obj: T, min?: number, max?: number) {
        const result = this.searchAll(obj, min, max);
        const results = result.filter((v) => this.array[v].obj === obj);
        return results;
    }
    /**
     * Searches within the indices `min` and `max` for and returns the indices for all objects which "equal" `obj`
     * according to `originalCompareFn`
     */
    private searchAll(obj: T, min?: number, max?: number) {
        min = min === undefined ? 0 : min;
        max = max === undefined ? this.array.length - 1 : max;
        const result = this.search(obj, min, max);
        if (!result.found) { return []; }

        let i;
        const results = [];
        for (i = result.index; i <= max && this.originalCompareFn(obj, this.array[i].obj) === 0; i++) {
            results.push(i);
        }
        for (i = result.index - 1; i >= min && this.originalCompareFn(obj, this.array[i].obj) === 0; i--) {
            results.unshift(i);
        }

        return results;
    }
    /**
     * Many functions in this library take an index as input and allow the index to be negative to indicate indexing
     * from the back of the array. This function takes that potentially negative index and returns the true index.
     */
    private calcTrueIndex(index: number) {
        if (index < 0 || Object.is(index, -0)) { index = this.array.length + index - 1; }
        return index;
    }
    /**
     * Returns an out of bounds (oob) error
     */
    private oob(index: number) {
        return new RangeError(`${index} is outside the bounds of this array: [0, ${this.array.length - 1}]`);
    }
    /**
     * Returns a unsupported operation (uo) error
     */
    private uo(operation: string) {
        return new Error(`${operation} is an invalid operation on a sorted array`);
    }
}

/**
 * Represents a single entry in a `SortedArray`. Contains the object which was inserted by the user, as well as the
 * index of the object used for insertion ordering.
 * 
 * Note: the `index` property of an `SANode` is NOT the object's index in the `SortedArray`! Rather, it's an unrelated
 * number used for determining how to compare the node against other nodes which are "equal" according to the compare
 * function used to construct the `SortedArray`.
 */
class SANode<T> {
    public obj: T;
    public index: number;
}

/**
 * Contains the results from a find operation. Specifically, it contains the object resulting from the operation as well
 * as the object's index in the `SortedArray`.
 */
export class FindResult<T> {
    public obj: T;
    public index: number;
}
