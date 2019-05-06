// tslint:disable: only-arrow-functions
import {
    deepStrictEqual,
    strictEqual,
    throws,
} from "assert";
import { SortedArray } from "lazy-sorted-array";

const input: Array<[number, number]> = [
    [0, 7],
    [7, 5],
    [9, 3],
    [4, 3],
    [9, 6],
    [8, 4],
    [1, 9],
    [1, 8],
    [1, 7],
    [1, 9],
    [5, 0],
    [9, 5],
    [9, 6],
    [8, 5],
    [6, 7],
];
const expected: Array<[number, number]> = [
    [0, 7],
    [1, 9],
    [1, 8],
    [1, 7],
    [1, 9],
    [4, 3],
    [5, 0],
    [6, 7],
    [7, 5],
    [8, 4],
    [8, 5],
    [9, 3],
    [9, 6],
    [9, 5],
    [9, 6],
];

describe("SortedArray", function() {
    describe("constructor", function() {
        it("should default to DefaultSort if compareFn is undefined", function() {
            const input2 = [
                "", Infinity, "\ud83c\ude03", "abc", NaN, [1, 2, 3], false, "ABC", "\ud83d\ude03", undefined,
                "\ud83d\ude02", "", new Map(), "ab", "a", "[", {}, 928375,
            ];
            const expected2 = input2.slice().sort();
            const sa = new SortedArray(undefined, input2);
            deepStrictEqual(sa.toArray(), expected2);
        });
        it("should construct an empty array when elements is undefined", function() {
            const sa = new SortedArray<[number, number]>((a, b) => a[0] - b[0]);
            deepStrictEqual(sa.toArray(), []);
        });
        it("should correctly wrap compareFn, providing insertion-order sorting", function() {
            const sa = newsa();
            deepStrictEqual(sa.toArray(), expected);
        });
        context("proxy support", function() {
            it("should override the default #length property", function() {
                const sa = newsa();
                strictEqual(sa.length, expected.length);
            });
            it("should permit length shortening", function() {
                const sa = newsa();
                sa.length = 11;
                strictEqual(sa.length, 11);
                strictEqual(sa.toArray().length, 11);
                sa.length = "0xa" as unknown as number;
                strictEqual(sa.length, 10);
                strictEqual(sa.toArray().length, 10);
            });
            it("should error on length extending, negative lengths, and non-numeric lengths", function() {
                const sa = newsa();
                throws(() => sa.length = 100, {
                    message: "The length of a SortedArray may not be extended",
                    name: "RangeError",
                });
                throws(() => sa.length = -10, {
                    message: "Invalid array length",
                    name: "RangeError",
                });
                throws(() => sa.length = "non-numeric" as unknown as number, {
                    message: "Invalid array length",
                    name: "RangeError",
                });
            });
            it("should support array-notation index getting and setting", function() {
                const sa = newsa();
                for (let i = 0; i < expected.length; i++) {
                    deepStrictEqual(sa[i], expected[i]);
                }
            });
            it("should throw an error when array-notation index getting outside the bounds", function() {
                const sa = newsa();
                throws(
                    () => sa[-1], {
                        message: `-1 is outside the bounds of this array: [0, ${sa.length - 1}]`,
                        name: "RangeError",
                    },
                );
                throws(
                    () => sa[sa.length], {
                        message: `${sa.length} is outside the bounds of this array: [0, ${sa.length - 1}]`,
                        name: "RangeError",
                    },
                );
            });
            it("should pass-through normal property setting", function() {
                const sa = newsa() as unknown as { test: string };
                sa.test = "10";
                strictEqual(sa.test, "10");
                // tslint:disable-next-line: no-string-literal
                sa["test"] = "fun with sorted arrays";
                // tslint:disable-next-line: no-string-literal
                strictEqual(sa["test"], "fun with sorted arrays");
            });
            it("should error on array-notation setting", function() {
                const sa = newsa();
                throws(
                    () => sa[0] = [6, 4], {
                        message: "set is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
    });
    context("public methods", function() {
        describe("#get", function() {
            it("should return the correct value", function() {
                const sa = newsa();
                for (let i = 0; i < sa.length; i++) {
                    deepStrictEqual(sa.get(i), expected[i]);
                }
            });
            it("should throw an error when indexing outside the bounds", function() {
                const sa = newsa();
                throws(
                    () => sa.get(-1), {
                        message: `-1 is outside the bounds of this array: [0, ${sa.length - 1}]`,
                        name: "RangeError",
                    },
                );
                throws(
                    () => sa.get(sa.length), {
                        message: `${sa.length} is outside the bounds of this array: [0, ${sa.length - 1}]`,
                        name: "RangeError",
                    },
                );
            });
        });
        describe("#add", function() {
            context("correct insertion-order: ", function() {
                let sa = new SortedArray((a, b) => a[0] - b[0], []);
                it("from the back of the array", function() {
                    for (let i = 0; i < 10; i++) {
                        const el = [2, 2];
                        sa.add(el);
                        // not deep equal, because we're specifically testing that they're the exact same array
                        strictEqual(sa[i], el);
                    }
                });
                it("from the front of the array", function() {
                    for (let i = 0; i < 10; i++) {
                        const el = [0, 0];
                        sa.add(el);
                        // not deep equal, because we're specifically testing that they're the exact same array
                        strictEqual(sa[i], el);
                    }
                });
                it("from the middle of the array", function() {
                    for (let i = 0; i < 10; i++) {
                        const el = [1, 1];
                        sa.add(el);
                        // not deep equal, because we're specifically testing that they're the exact same array
                        strictEqual(sa[10 + i], el);
                    }
                });
                it("when adding multiple elements", function() {
                    sa = new SortedArray((a, b) => a[0] - b[0], []);
                    for (let i = 0; i < 10; i++) {
                        const a = [0, 0];
                        const b = [1, 1];
                        const c = [2, 2];
                        sa.add(a, b, c);
                        // not deep equal, because we're specifically testing that they're the exact same array
                        strictEqual(sa[1 * (i + 1) - 1], a);
                        strictEqual(sa[2 * (i + 1) - 1], b);
                        strictEqual(sa[3 * (i + 1) - 1], c);
                    }
                });
            });
        });
        describe("#toArray", function() {
            it("should correctly return a new array with properly sorted items", function() {
                const sa = newsa();
                const ar = sa.toArray();
                deepStrictEqual(ar, expected);
            });
        });
        describe("#findNth", function() {
            context("positive n:", function() {
                it("0", function() {
                    const sa = newsa();
                    const result0 = sa.findNth([1, 1], 0);
                    strictEqual(result0.index, 1);
                    deepStrictEqual(result0.obj, input[6]);
                });
                it("2", function() {
                    const sa = newsa();
                    const result0 = sa.findNth([9, 9], 2);
                    strictEqual(result0.index, 13);
                    deepStrictEqual(result0.obj, input[11]);
                });
            });
            context("negative n:", function() {
                it("-0", function() {
                    const sa = newsa();
                    const result0 = sa.findNth([9, 9], -0);
                    strictEqual(result0.index, 14);
                    deepStrictEqual(result0.obj, input[12]);
                });
                it("-2", function() {
                    const sa = newsa();
                    const result0 = sa.findNth([1, 1], -2);
                    strictEqual(result0.index, 2);
                    deepStrictEqual(result0.obj, input[7]);
                });
            });
            context("invalid n:", function() {
                it("past upper bound", function() {
                    const sa = newsa();
                    const result0 = sa.findNth([0, 0], 1);
                    strictEqual(result0, undefined);
                });
                it("past lower bound", function() {
                    const sa = newsa();
                    const result0 = sa.findNth([0, 0], -1);
                    strictEqual(result0, undefined);
                });
            });
            context("exact", function() {
                it("should find exact references", function() {
                    const exact: [number, number] = [2, 2];
                    const input2: Array<[number, number]> = [
                        [0, 7],
                        exact,
                        [9, 3],
                        [4, 3],
                        [9, 6],
                        [8, 4],
                        [1, 9],
                        [1, 8],
                        [1, 7],
                        [1, 9],
                        exact,
                        [9, 5],
                        [9, 6],
                        [8, 5],
                        [6, 7],
                    ];
                    const sa = new SortedArray((a, b) => a[0] - b[0], input2);
                    let result = sa.findNth(exact, 0, true);
                    strictEqual(result.index, 5);
                    strictEqual(result.obj, exact);
                    result = sa.findNth(exact, -0, true);
                    strictEqual(result.index, 6);
                    strictEqual(result.obj, exact);
                    result = sa.findNth(exact, 5, true);
                    strictEqual(result, undefined);
                });
            });
        });
        describe("#findAll", function() {
            it("should return all non-exact matches", function() {
                const sa = newsa();
                const result = sa.findAll([1, 1]);
                const resultIndices = result.map((v) => v.index);
                const resultObjs = result.map((v) => v.obj);
                deepStrictEqual(resultIndices, [1, 2, 3, 4]);
                deepStrictEqual(resultObjs, [
                    [1, 9],
                    [1, 8],
                    [1, 7],
                    [1, 9],
                ]);
            });
            it("should return all exact matches", function() {// XXX: I don't like this solution.
                const sa = newsa();
                const exact: [number, number] = [1, 1];
                for (let i = 0; i < 6; i++) {
                    if (i % 2) {
                        sa.add(exact);
                    } else {
                        sa.add([1, 1]);
                    }
                }
                const result = sa.findAll(exact, true);
                const resultIndices = result.map((v) => v.index);
                const resultObjs = result.map((v) => v.obj);
                deepStrictEqual(resultIndices, [6, 8, 10]);
                for (const obj of resultObjs) {
                    strictEqual(obj, exact);
                }
            });
        });
        describe("#findNearest", function() {
            it("should return { lt: undefined, gt: undefined } if the array is empty", function() {
                const sa = new SortedArray<[number, number]>((a, b) => a[0] - b[0]);
                const result = sa.findNearest([1, 1]);
                deepStrictEqual(result, { lt: undefined, gt: undefined });
            });
            it("should return { lt: undefined, gt: X } if obj would be inserted before the first element", function() {
                const sa = newsa();
                const result = sa.findNearest([-1, 1]);
                deepStrictEqual(result, { lt: undefined, gt: { index: 0, obj: [0, 7] } });
            });
            it("should return { lt: X, gt: undefined } if obj would be inserted after the last element", function() {
                const sa = newsa();
                const result = sa.findNearest([10, 1]);
                deepStrictEqual(result, { lt: { index: 14, obj: [9, 6] }, gt: undefined });
            });
            it("should return { lt: X, gt: X } if obj would be inserted between two elements", function() {
                const sa = newsa();
                const result = sa.findNearest([2, 1]);
                deepStrictEqual(result, { lt: { index: 4, obj: [1, 9] }, gt: { index: 5, obj: [4, 3] } });
            });
            it("should return { eq: X } if an equal element is in the array", function() {
                const sa = newsa();
                const result = sa.findNearest([4, 1]);
                deepStrictEqual(result, { eq: { index: 5, obj: [4, 3] } });
            });
        });
        describe("#remove", function() {
            it("should remove the correct element and modify the array correctly", function() {
                const sa = newsa();
                const result = sa.remove(5);
                deepStrictEqual(result, [expected[5]]);
                const expectedArray = expected.slice();
                expectedArray.splice(5, 1);
                deepStrictEqual(sa.toArray(), expectedArray);
            });
            it("should throw an error when indexing outside the bounds", function() {
                const sa = newsa();
                throws(
                    () => sa.remove(-1), {
                        message: `-1 is outside the bounds of this array: [0, ${sa.length - 1}]`,
                        name: "RangeError",
                    },
                );
                throws(
                    () => sa.remove(sa.length), {
                        message: `${sa.length} is outside the bounds of this array: [0, ${sa.length - 1}]`,
                        name: "RangeError",
                    },
                );
            });
        });
        describe("#removeAll", function() {
            it("should remove all given indices", function() {
                const sa = newsa();
                const expectedReturned = [
                    [0, 7],
                    [7, 5],
                    [9, 6],
                ];
                const expectedArray = [
                    [1, 9],
                    [1, 8],
                    [1, 7],
                    [1, 9],
                    [4, 3],
                    [5, 0],
                    [6, 7],
                    [8, 4],
                    [8, 5],
                    [9, 3],
                    [9, 6],
                    [9, 5],
                ];
                const result = sa.removeAll([0, 8, 14]);
                deepStrictEqual(result, expectedReturned);
                deepStrictEqual(sa.toArray(), expectedArray);
            });
        });
    });
    context("interface methods", function() {
        describe("#toString", function() {
            it("should mirror the functionality of Array#toString", function() {
                const sa = newsa();
                deepStrictEqual(sa.toString(), expected.toString());
            });
            it("should not error in a circular array", function() {
                const sa = new SortedArray<SortedArray<any>>();
                sa.add(null, sa);
                strictEqual(sa.toString(), "[Circular]");
            });
        });
        describe("#toLocaleString", function() {
            it("should mirror the functionality of Array#toLocaleString", function() {
                const sa = newsa();
                deepStrictEqual(sa.toLocaleString(), expected.toLocaleString());
            });
            it("should not error in a circular array", function() {
                const sa = new SortedArray<SortedArray<any>>();
                sa.add(null, sa);
                strictEqual(sa.toLocaleString(), "[Circular]");
            });
        });
        describe("#pop", function() {
            it("should remove and return the last element", function() {
                const sa = newsa();
                const expected2 = expected.slice();
                deepStrictEqual(sa.pop(), expected2.pop());
                deepStrictEqual(sa.toArray(), expected2);
            });
        });
        describe("#push", function() {
            it("should throw an error", function() {
                const sa = newsa();
                throws(
                    () => sa.push([1, 1]), {
                        message: "push is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
        describe("#concat", function() {
            it("should throw an error", function() {
                const sa = newsa();
                throws(
                    () => sa.concat(), {
                        message: "concat is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
        describe("#join", function() {
            it("should mirror the functionality of Array#join", function() {
                const sa = newsa();
                deepStrictEqual(sa.join(","), expected.join(","));
            });
        });
        describe("#reverse", function() {
            it("should throw an error", function() {
                const sa = newsa();
                throws(
                    () => sa.reverse(), {
                        message: "reverse is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
        describe("#shift", function() {
            it("should remove and return the first element", function() {
                const sa = newsa();
                const result = sa.shift();
                deepStrictEqual(result, expected[0]);
                deepStrictEqual(sa.toArray(), expected.slice(1));
            });
        });
        describe("#slice", function() {
            it("should function equivalently to Array.slice for all start and end", function() {
                const sa = newsa();
                // slice behaves a little funny with negative start and end, so we just try all relevant options.
                // (including indices outside of bounds)
                for (let start = -sa.length - 1; start < sa.length + 1; start++) {
                    for (let end = -sa.length - 1; end < sa.length + 1; end++) {
                        const slice = sa.slice(start, end);
                        deepStrictEqual(slice, expected.slice(start, end));
                    }
                }
            });
        });
        describe("#sort", function() {
            it(
                "should force a sort, despite no detectable changes to the array, when provided no compare function",
                function() {// XXX: This is a bit clunky
                    const input2: Array<[number, number]> = [
                        [0, 7],
                        [7, 5],
                        [9, 3],
                        [4, 3],
                        [9, 6],
                        [8, 4],
                        [1, 9],
                        [1, 8],
                        [1, 7],
                        [1, 9],
                        [5, 0],
                        [9, 5],
                        [9, 6],
                        [8, 5],
                        [6, 7],
                    ];
                    const expected2premut: Array<[number, number]> = [
                        [0, 7],
                        [1, 9],
                        [1, 8],
                        [1, 7],
                        [1, 9],
                        [4, 3],
                        [5, 0],
                        [6, 7],
                        [7, 5],
                        [8, 4],
                        [8, 5],
                        [9, 3],
                        [9, 6],
                        [9, 5],
                        [9, 6],
                    ];
                    const expected2presort: Array<[number, number]> = [
                        [0, 7],
                        [1, 9],
                        [5, 8],
                        [1, 7],
                        [5, 9],
                        [4, 3],
                        [5, 0],
                        [6, 7],
                        [5, 5],
                        [8, 4],
                        [8, 5],
                        [9, 3],
                        [9, 6],
                        [9, 5],
                        [9, 6],
                    ];
                    const expected2post: Array<[number, number]> = [
                        [0, 7],
                        [1, 9],
                        [1, 7],
                        [4, 3],
                        [5, 5],
                        [5, 8],
                        [5, 9],
                        [5, 0],
                        [6, 7],
                        [8, 4],
                        [8, 5],
                        [9, 3],
                        [9, 6],
                        [9, 5],
                        [9, 6],
                    ];
                    const sa = new SortedArray((a, b) => a[0] - b[0], input2);
                    deepStrictEqual(sa.toArray(), expected2premut);
                    input2[1][0] = 5;
                    input2[7][0] = 5;
                    input2[9][0] = 5;
                    deepStrictEqual(sa.toArray(), expected2presort);
                    sa.sort();
                    deepStrictEqual(sa.toArray(), expected2post);
                },
            );
            it("should throw an error when provided a compare function", function() {
                const sa = newsa();
                throws(
                    () => sa.sort(() => 0), {
                        message:
                            "sort is an invalid operation on a sorted array when providing a new compare function",
                        name: "Error",
                    },
                );
            });
        });
        describe("#splice", function() {
            it("should function equivalently to Array.splice for all start and deleteCount", function() {
                // splice behaves a little funny with negative start, so we just try all relevant options.
                // (including indices outside of bounds)
                for (let start = -input.length - 1; start < input.length + 1; start++) {
                    for (let deleteCount = -1; deleteCount < input.length + 1; deleteCount++) {
                        // we have to remake sa and expected 2 each iteration because splicing them mutates them.
                        const sa = newsa();
                        const expected2 = expected.slice();
                        const splice = sa.splice(start, deleteCount);
                        const expectedSplice = expected2.splice(start, deleteCount);
                        deepStrictEqual(splice, expectedSplice);
                        deepStrictEqual(sa.toArray(), expected2);
                    }
                }
            });
            it("should throw an error when given replacement items", function() {
                const sa = newsa();
                throws(
                    // tsc is telling me that splice only accepts 2 arguments, so I have to call it via Function.call...
                    () => sa.splice.call(sa, 0, 0, [[1, 1]]), {
                        message: "splice is an invalid operation on a sorted array when providing replacement items",
                        name: "Error",
                    },
                );
            });
        });
        describe("#unshift", function() {
            it("should throw an error", function() {
                const sa = newsa();
                throws(
                    () => sa.unshift(), {
                        message: "unshift is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
        describe("#includes", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const result = sa.includes([0, 7]);
                strictEqual(result, true);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.includes(input[1], -input.length + 1, -1, true);
                strictEqual(result, true);
            });
        });
        describe("#indexOf", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const result = sa.indexOf([0, 7]);
                strictEqual(result, 0);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.indexOf([-1, 7]);
                strictEqual(result, -1);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.indexOf(input[0], undefined, undefined, true);
                strictEqual(result, 0);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.indexOf([-1, 7], undefined, undefined, true);
                strictEqual(result, -1);
            });
        });
        describe("#lastIndexOf", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const result = sa.lastIndexOf([0, 7]);
                strictEqual(result, 0);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.lastIndexOf([-1, 7]);
                strictEqual(result, -1);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.lastIndexOf(input[0], undefined, undefined, true);
                strictEqual(result, 0);
            });
            it("simple test", function() {
                const sa = newsa();
                const result = sa.lastIndexOf([-1, 7], undefined, undefined, true);
                strictEqual(result, -1);
            });
        });
        describe("#every", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.every((a, b, c) => {
                    actualState.push([a, b, c]);
                    return b <= 9;
                });
                const result = expected.every((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return b <= 9;
                });
                strictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.every((a, b) => {
                    actualState.push([a, b]);
                    return true;
                });
                const result = expected.every((a, b) => {
                    expectedState.push([a, b]);
                    return true;
                });
                strictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#some", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.some((a, b, c) => {
                    actualState.push([a, b, c]);
                    return b === 9;
                });
                const result = expected.some((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return b === 9;
                });
                strictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.some((a, b) => {
                    actualState.push([a, b]);
                    return false;
                });
                const result = expected.some((a, b) => {
                    expectedState.push([a, b]);
                    return false;
                });
                strictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#forEach", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                sa.forEach((a, b, c) => {
                    actualState.push([a, b, c]);
                });
                expected.forEach((a, b, c) => {
                    expectedState.push([a, b, c]);
                });
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                sa.forEach((a, b) => {
                    actualState.push([a, b]);
                });
                expected.forEach((a, b) => {
                    expectedState.push([a, b]);
                });
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#map", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actual = sa.map((a, b, c) => [a, b, c]);
                const result = expected.map((a, b, c) => [a, b, c]);
                deepStrictEqual(actual, result);
            });
            it("simple test", function() {
                const sa = newsa();
                const actual = sa.map((a, b) => [a, b]);
                const result = expected.map((a, b) => [a, b]);
                deepStrictEqual(actual, result);
            });
        });
        describe("#filter", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.filter((a, b, c) => {
                    actualState.push([a, b, c]);
                    return Boolean(b % 2);
                });
                const result = expected.filter((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return Boolean(b % 2);
                });
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.filter((a, b) => {
                    actualState.push([a, b]);
                    return Boolean(b % 2);
                });
                const result = expected.filter((a, b) => {
                    expectedState.push([a, b]);
                    return Boolean(b % 2);
                });
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#reduce", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.reduce((a, b, c, d) => {
                    actualState.push([a, b, c, d]);
                    return 0;
                }, 0);
                const result = expected.reduce((a, b, c, d) => {
                    expectedState.push([a, b, c, d]);
                    return 0;
                }, 0);
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.reduce((a, b, c) => {
                    actualState.push([a, b, c]);
                    return 0;
                }, 0);
                const result = expected.reduce((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return 0;
                }, 0);
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#reduceRight", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.reduceRight((a, b, c, d) => {
                    actualState.push([a, b, c, d]);
                    return 0;
                }, 0);
                const result = expected.reduceRight((a, b, c, d) => {
                    expectedState.push([a, b, c, d]);
                    return 0;
                }, 0);
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.reduceRight((a, b, c) => {
                    actualState.push([a, b, c]);
                    return 0;
                }, 0);
                const result = expected.reduceRight((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return 0;
                }, 0);
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#find", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.find((a, b, c) => {
                    actualState.push([a, b, c]);
                    return b === 9;
                });
                const result = expected.find((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return b === 9;
                });
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.find((a, b) => {
                    actualState.push([a, b]);
                    return false;
                });
                const result = expected.find((a, b) => {
                    expectedState.push([a, b]);
                    return false;
                });
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#findIndex", function() {
            // XXX: These are very preliminary tests which need to be redone!
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.findIndex((a, b, c) => {
                    actualState.push([a, b, c]);
                    return b === 9;
                });
                const result = expected.findIndex((a, b, c) => {
                    expectedState.push([a, b, c]);
                    return b === 9;
                });
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
            it("simple test", function() {
                const sa = newsa();
                const actualState: any[] = [];
                const expectedState: any[] = [];
                const actual = sa.findIndex((a, b) => {
                    actualState.push([a, b]);
                    return false;
                });
                const result = expected.findIndex((a, b) => {
                    expectedState.push([a, b]);
                    return false;
                });
                deepStrictEqual(actual, result);
                deepStrictEqual(actualState, expectedState);
            });
        });
        describe("#fill", function() {
            it("should throw an error", function() {
                const sa = newsa();
                throws(
                    () => sa.fill([1, 1]), {
                        message: "fill is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
        describe("#copyWithin", function() {
            it("should throw an error", function() {
                const sa = newsa();
                throws(
                    () => sa.copyWithin(0, 0), {
                        message: "copyWithin is an invalid operation on a sorted array",
                        name: "Error",
                    },
                );
            });
        });
        describe("#Symbol.iterator", function() {
            it("should return a functional iterator over the values of the array", function() {
                const sa = newsa();
                const expectedIterator = expected[Symbol.iterator]();
                for (const givenValue of sa) { // for of loops use Symbol.iterator
                    const expectedValue = expectedIterator.next();
                    deepStrictEqual(givenValue, expectedValue.value);
                }
                strictEqual(true, expectedIterator.next().done);
            });
        });
        describe("#entries", function() {
            it("should return a functional iterator over the entries of the array", function() {
                const sa = newsa();
                const expectedIterator = expected.entries();
                for (const givenEntry of sa.entries()) {
                    const expectedEntry = expectedIterator.next();
                    deepStrictEqual(givenEntry, expectedEntry.value);
                }
                strictEqual(true, expectedIterator.next().done);
            });
        });
        describe("#keys", function() {
            it("should return a functional iterator over the keys of the array", function() {
                const sa = newsa();
                const expectedIterator = expected.keys();
                for (const givenKey of sa.keys()) {
                    const expectedKey = expectedIterator.next();
                    deepStrictEqual(givenKey, expectedKey.value);
                }
                strictEqual(true, expectedIterator.next().done);
            });
        });
        describe("#values", function() {
            it("should return a functional iterator over the values of the array", function() {
                const sa = newsa();
                const expectedIterator = expected.values();
                for (const givenValue of sa.values()) {
                    const expectedValue = expectedIterator.next();
                    deepStrictEqual(givenValue, expectedValue.value);
                }
                strictEqual(true, expectedIterator.next().done);
            });
        });
        describe("#Symbol.unscopables", function() {
            it("should be identical to Array[Symbol.unscopables]()", function() {
                const sa = newsa();
                deepStrictEqual(sa[Symbol.unscopables](), Array.prototype[Symbol.unscopables]);
            });
        });
    });
    context("inner functionality tests", function() {
        describe("search min and max", function() {
            it("must be positive finite integers", function() {
                const sa = newsa();
                throws(
                    () => sa.includes([0, 0], NaN), {
                        message: "min must be a positive finite integer!",
                        name: "Error",
                    },
                );
                throws(
                    () => sa.includes([0, 0], 0.5), {
                        message: "min must be a positive finite integer!",
                        name: "Error",
                    },
                );
                throws(
                    () => sa.includes([0, 0], 0, NaN), {
                        message: "max must be a positive finite integer and must not be larger than the length of " +
                            "this array!",
                        name: "Error",
                    },
                );
                throws(
                    () => sa.includes([0, 0], 0, 0.5), {
                        message: "max must be a positive finite integer and must not be larger than the length of " +
                            "this array!",
                        name: "Error",
                    },
                );
            });
        });
        describe("compareFn", function() {
            it("should only return non-NaN numbers", function() {
                const sa = new SortedArray((a, b) => NaN, input);
                throws(
                    () => sa.includes([0, 0]), {
                        message: "Compare function cannot return NaN",
                        name: "Error",
                    },
                );
            });
        });
        describe("insertionCounter", function() {
            it("should function correctly in arrays which have seen more than 18014398509481982 elements", function() {
                const sa = new SortedArray<[number, number]>((a, b) => a[0] - b[0]);
                // simulate adding and removing 18014398509481972 items
                Reflect.set(sa, "insertionCounter", Number.MAX_SAFE_INTEGER - 10);
                sa.addAll(input);
                const input2: Array<[number, number]> = [
                    [0, -Infinity],
                    [1, -Infinity],
                    [2, -Infinity],
                    [3, -Infinity],
                    [4, -Infinity],
                    [5, -Infinity],
                    [6, -Infinity],
                    [7, -Infinity],
                    [8, -Infinity],
                    [9, -Infinity],
                ];
                const expected2: Array<[number, number]> = [
                    [0, 7],
                    [0, -Infinity],
                    [1, 9],
                    [1, 8],
                    [1, 7],
                    [1, 9],
                    [1, -Infinity],
                    [2, -Infinity],
                    [3, -Infinity],
                    [4, 3],
                    [4, -Infinity],
                    [5, 0],
                    [5, -Infinity],
                    [6, 7],
                    [6, -Infinity],
                    [7, 5],
                    [7, -Infinity],
                    [8, 4],
                    [8, 5],
                    [8, -Infinity],
                    [9, 3],
                    [9, 6],
                    [9, 5],
                    [9, 6],
                    [9, -Infinity],
                ];
                // to ensure nothing weird has happened with the insertion orders, we insert new elements and check that
                // they all turn up as expected
                sa.addAll(input2);
                deepStrictEqual(sa.toArray(), expected2);
            });
        });
    });
    context("CompareFunctions", function() {
        describe("AlphabeticSort", function() {
            it("should sort alphabetically", function() {
                const input2 = [
                    "", "\ud83c\ude03", "AB", "abc", "ABC", "\ud83d\ude03", undefined, "\ud83d\ude02", "", "ab", "a",
                ];
                const expected2 = [
                    "", "", "\ud83d\ude02", "\ud83d\ude03", "a", "ab", "AB", "abc", "ABC", "\ud83c\ude03", undefined,
                ];
                input2.sort(SortedArray.CompareFunctions.AlphabeticSort);
                deepStrictEqual(input2, expected2);
            });
        });
        describe("AlphabeticSortIgnoreCase", function() {
            it("should sort alphabetically and ignore case", function() {
                const input2 = [
                    "", "\ud83c\ude03", "AB", "abc", "ABC", "\ud83d\ude03", undefined, "\ud83d\ude02", "", "ab", "a",
                ];
                const expected2 = [
                    "", "", "\ud83d\ude02", "\ud83d\ude03", "a", "AB", "ab", "abc", "ABC", "\ud83c\ude03", undefined,
                ];
                input2.sort(SortedArray.CompareFunctions.AlphabeticSortIgnoreCase);
                deepStrictEqual(input2, expected2);
            });
        });
        describe("DefaultSort", function() {
            it("should sort identically to Array.sort", function() {
                const input2 = [
                    "", Infinity, "\ud83c\ude03", "abc", NaN, [1, 2, 3], false, "ABC", "\ud83d\ude03", "", undefined,
                    "\ud83d\ude02", new Map(), "ab", "a", "[", {}, 928375, "928375",
                ];
                const expected2 = input2.slice().sort();
                input2.sort(SortedArray.CompareFunctions.DefaultSort);
                deepStrictEqual(input2, expected2);
            });
        });
        describe("LocaleAlphabeticSort", function() {
            it("should sort alphabetically with respect to locale and options", function() {
                const input2 = [
                    "", "\ud83c\ude03", "abc", "ABC", "\ud83d\ude03", undefined, "\ud83d\ude02", "", "ab", "a",
                ];
                const expected2 = [
                    "", "", "\ud83d\ude02", "\ud83d\ude03", "a", "ab", "abc", "ABC", "\ud83c\ude03", undefined,
                ];
                input2.sort(SortedArray.CompareFunctions.LocaleAlphabeticSort());
                deepStrictEqual(input2, expected2);
            });
        });
        describe("NumericSort", function() {
            it("should sort numerically", function() {
                const input2 = [
                    7, 2, 7, 3, 2, 9, 4, 5, 7, 3, 1, 6, 6,
                ];
                const expected2 = [
                    1, 2, 2, 3, 3, 4, 5, 6, 6, 7, 7, 7, 9,
                ];
                input2.sort(SortedArray.CompareFunctions.NumericSort);
                deepStrictEqual(input2, expected2);
            });
        });
        describe("SortInverter", function() {
            it("should invert a sorting function", function() {
                const input2 = [
                    7, 2, 7, 3, 2, 9, 4, 5, 7, 3, 1, 6, 6,
                ];
                const expected2 = [
                    9, 7, 7, 7, 6, 6, 5, 4, 3, 3, 2, 2, 1,
                ];
                input2.sort(SortedArray.CompareFunctions.SortInverter(SortedArray.CompareFunctions.NumericSort));
                deepStrictEqual(input2, expected2);
            });
        });
    });
});

function newsa() {
    return new SortedArray((a, b) => a[0] - b[0], input);
}
