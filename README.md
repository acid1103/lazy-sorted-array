# Lazy Sorted Array [![Build Status](https://travis-ci.com/acid1103/lazy-sorted-array.svg?branch=master)](https://travis-ci.com/acid1103/lazy-sorted-array) [![Coverage Status](https://coveralls.io/repos/github/acid1103/lazy-sorted-array/badge.svg?branch=master)](https://coveralls.io/github/acid1103/lazy-sorted-array?branch=master) [![NPM version](https://img.shields.io/npm/v/lazy-sorted-array.svg?color=success)](https://www.npmjs.com/package/lazy-sorted-array)

Lazy Sorted Array is a sorted array library written purely in TypeScript. It implements a [lazy sort](https://github.com/acid1103/lazy-sorted-array/blob/master/README.md#lazy-sort), as well as [insertion ordering](https://github.com/acid1103/lazy-sorted-array/blob/master/README.md#insertion-order). It also supports most functions supported by the default javascript Array, including indexing via bracket notation, `for...of` iteration, and manual adjustment of the `length` property.

## Using
To install Lazy Sorted Array, simply use your package manager of choice:
```bash
# npm
npm install lazy-sorted-array
# yarn
yarn add lazy-sorted-array
# etc...
```
Then import and use as usual:
```typescript
// typescript
import { SortedArray } from "lazy-sorted-array";
// javascript
const SortedArray = require("lazy-sorted-array").SortedArray;
```

## Caveats
While the intention is for the Lazy Sorted List implementation to match the default Array prototype as closely as possible, some functions in the Array prototype can't be implemented while maintaining the internal state required. As such, attempting to call these functions will result in an error being thrown. Below is a list of these functions:
- push
- concat
- reverse
- unshift
- fill
- copyWithin
- set (i.e., `array[0] = 10`)

In addition, there are a few functions for which certain arguments can't be utilized. Like the functions above, attempting to call these function with the given arguments will result in an error being thrown. Below is a table of these functions along with the invalid arguments:

Function|Invalid Argument
-|-
sort|compareFn
splice|items

*Note: The current state of these functions is considered unimplemented. They may change at any point. The above is simply their current state as of version 1.0.0.*

## Added Functionality
Lazy Sorted Array adds several functions on top of the Array prototype which take advantage of the fact that the elements are sorted and insertion-ordered. They're outlined below.

### findNth(obj: T, n: number, exact?: boolean)

Finds the `nth` entry of the given `obj` in the array. If `exact` is true, finds the `nth` entry of the exact reference passed via `obj`. If the `nth` entry cannot be found, `undefined` is returned.

**Specifications for `n`**

`findNth` works as defined above for all positive `n`. For negative `n` (including `-0`,) indexing begins starting from the **last** object in the array which matches `obj` and advances backwards `-n` times. `n` may also be `undefined`. In this case, the first entry found which which matches `obj` is returned. No guarantee is made about the entry's location relative to other entries which match `obj`.

**Examples**

```typescript
const exact: [number, number] = [3, 1];
const array: Array<[number, number]> = [
    [1, 1], [1, 2], [2, 1], [2, 2], [2, 3], exact, exact
];
// generate a SortedArray whose elements are a copy of array
// and which sorts its elements via a numerical comparison of
// the first (0th) index of each sub-array
const sa = new SortedArray((a, b) => a[0] - b[0], array);

// basic functionality
sa.findNth([1, 1], 0, false);  // -> { obj: [1, 1], index: 0 }
sa.findNth([1, 1], 1, false);  // -> { obj: [1, 2], index: 1 }
sa.findNth([1, 1], 2, false);  // -> undefined

// negative n
sa.findNth([2, 1], 0, false);  // -> { obj: [2, 1], index: 2 }
sa.findNth([2, 1], -0, false); // -> { obj: [2, 3], index: 4 }
sa.findNth([2, 1], 1, false);  // -> { obj: [2, 2], index: 3 }
sa.findNth([2, 1], -1, false); // -> { obj: [2, 2], index: 3 }

// finding exact objects
sa.findNth(exact, 0, true);    // -> { obj: [3, 1], index: 5 }
sa.findNth(exact, 1, true);    // -> { obj: [3, 1], index: 6 }
sa.findNth(exact, -1, true);   // -> { obj: [3, 1], index: 5 }
sa.findNth(exact, -2, true);   // -> undefined
```

### findAll(obj: T, exact?: boolean)

Finds all elements of the array which match the given `obj`, determined by the compare function given to construct the SortedArray. If `exact` is true, finds all entries of the exact reference passed via `obj`. The order of the elements returned will be in the order in which they were inserted into the array. If there are no elements which match `obj` found within the array, an empty array is returned.

**Examples**

```typescript
const exact: [number, number] = [3, 1];
const array: Array<[number, number]> = [
    [1, 1], [1, 2], [2, 1], [2, 2], [2, 3], exact, exact
];
// generate a SortedArray whose elements are a copy of array
// and which sorts its elements via a numerical comparison of
// the first (0th) index of each sub-array
const sa = new SortedArray((a, b) => a[0] - b[0], array);

// not exact
sa.findAll([1, 1], false);
  // -> [{ obj: [1, 1], index: 0 }, { obj: [1, 2], index: 1 }]

// exact
sa.findAll(exact, true);
  // -> [{ obj: [3, 1], index: 5 }, { obj: [3, 1], index: 6 }]

// doesn't exist
sa.findAll([4, 1], false);
  // -> []
```

### findNearest(obj: T)

Finds the elements in the SortedArray which would be nearest to `obj` if `obj` were to be inserted into the array.

Specifically, if there is an element equal to `obj` (according to the compare function used to construct the SortedArray), this function returns an object containing an `eq` property which corresponds to that element. Otherwise, this function returns the elements which would come directly before and directly after (`lt` and `gt` respectively) `obj` if `obj` were to be inserted into the array.

Note: if `obj` would be at an end of the array, `lt` or `gt` will be undefined depending on which end of the array `obj` would be. If the array is of size 0, this function is guaranteed to return `{ lt: undefined, gt: undefined }`.

**Examples**
```typescript
// Note that this example differs from those above in that
// exact = [4, 1] instead of exact = [3, 1].
const exact: [number, number] = [4, 1];
const array: Array<[number, number]> = [
    [1, 1], [1, 2], [2, 1], [2, 2], [2, 3], exact, exact
];
// generate a SortedArray whose elements are a copy of array
// and which sorts its elements via a numerical comparison of
// the first (0th) index of each sub-array
const sa = new SortedArray((a, b) => a[0] - b[0], array);

// equal
sa.findNearest([1, 1]);
  // -> { eq: { obj: [1, 1], index: 0 } }

// not equal, but in the middle
sa.findAll([3, 1]);
  // -> { lt: { obj: [2, 3], index: 4 },
  //      gt: { obj: [4, 1], index: 5 } }

// not equal, on the edge
sa.findAll([0, 0]);
  // -> { lt: undefined, gt: { obj: [1, 1], index: 0 } }
```

## What do lazy sort and insertion order mean?
### Lazy Sort
A Lazy Sorted Array will only sort when it needs to. This yielding greater speed for applications which insert many elements between reads. Most sorted data structures sort their elements as they get added. This means that insertion is slow but reading is fast. However, if an application needs to insert many items at a time, reading in between bursts of insertions, these types of data structures can be a bottleneck. For that reason, sorting lazily can give a significant speed improvement in these environments.

### Insertion Order
Lazy Sorted Array implements insertion-order sorting in addition to the standard sorting via a given compare function. This means inserting two equivalent objects won't result in their positions in the array being random relative to each other. In other words, if `a` and `b` are equal according to the compare function, then inserting `a` prior to inserting `b` will guarantee that `a` will be closer to the beginning of the array than `b`.
