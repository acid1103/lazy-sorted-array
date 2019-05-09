const fs = require("fs");
const exec = require("child_process").exec;
const minimatch = require("minimatch");

(async function() {
    let {
        travisIgnore,
        diff
    } = await getTravisIgnoreAndDiff();
    let matches = minimatch.match(diff, travisIgnore);
    let shouldTerminate = diff.every((s, i) => s === matches[i])
    if (shouldTerminate) {
        try {
            console.log("No code changes detected in diff. Terminating travis.");
            await travisTerminate(0);
            process.exit(0);
        } catch (e) {
            console.error("Couldn't travis_terminate! Exiting with code 0 to finish the build.");
            console.error(e.stack);
            process.exit(0);
        }
    } else {
        codeFiles = diff.filter(s => !matches.includes(s));
        console.log(`The following code file changes were detected in the diff:\n${codeFiles.join("\n")}`);
    }
})();

async function getTravisIgnoreAndDiff() {
    let resolve;
    let promise = new Promise(res => {
        resolve = res;
    });
    let travisIgnore = getTravisIgnore();
    let diff = getDiff();

    Promise.all([travisIgnore, diff])
        .then(v => {
            resolve({
                travisIgnore: v[0],
                diff: v[1]
            });
        })
        .catch((e) => {
            console.error("Couldn't get .travisignore or diff! Exiting with code 0 to finish the build.");
            console.error(e.stack);
            process.exit(0);
        });

    return promise;
}

async function getTravisIgnore() {
    let resolve, reject;
    let promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    fs.readFile(".travisignore", "utf8", (err, data) => {
        if (err) {
            reject(err);
            return;
        } else if (data) {
            let split = data.trim().split("\n").map(s => s.trim());
            if (split.length !== 0) {
                let ignore;
                if (split.length === 1) {
                    ignore = split[0];
                } else {
                    ignore = `{${split.join(",")}}`;
                }
                resolve(ignore);
                return;
            }
        }
        console.log("No data read from .travisignore. Ignoring nothing.");
        resolve("!**");
    });
    return promise;
}

async function getDiff() {
    return new Promise((resolve, reject) => {
        exec(
            "git diff @~21..@ --name-only",
            (error, stdout) => {
                if (error) {
                    reject(error);
                } else if (stdout) {
                    resolve(stdout.trim().split("\n"));
                } else {
                    console.log("No diff detected! Resolving anyway.");
                    resolve();
                }
            }
        );
    });
}

async function travisTerminate(code) {
    return new Promise((resolve, reject) => {
        exec(
            `travis_terminate ${code}`,
            (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    console.log("No diff detected! Resolving anyway.");
                    resolve(stdout);
                }
            }
        );
    })
}
