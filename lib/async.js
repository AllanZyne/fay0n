"use strict";

function async(fn) {
    return function() {
        let args = arguments;
        let ctx = this || {};

        function spawn(genF) {
            return new Promise(function(resolve, reject) {
                let gen = genF.apply(ctx, args);

                function step(nextF) {
                    let next;
                    try {
                        next = nextF();
                    } catch (e) {
                        // 当执行流程上有异常时，会直接 reject
                        return reject(e);
                    }

                    if (next.done) {
                        return resolve(next.value);
                    }

                    // 当 Promise 失败时，会向执行流程上抛出异常
                    Promise.resolve(next.value).then(
                        v => step(() => gen.next(v)),
                        e => step(() => gen.throw(e))
                    );
                }

                step(() => gen.next() );
            });
        }

        return spawn(fn);
    };
}

// ----------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");


function readFile(file, options) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, options, function(err, result) {
            if (err)   reject(err);
            else       resolve(result);
        });
    });
}

function __writeFile(file, data, options) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, options, function(err) {
            if (err)   reject(err);
            else       resolve();
        });
    });
}

var writeFile = async(function*(file, data, options) {
    yield mkdirp(path.dirname(file));
    yield __writeFile(file, data, options);
});

function access(path, mode) {
    return new Promise((resolve, reject) => {
         fs.access(path, mode, function(err) {
             if (err)   resolve(false);
             else       resolve(true);
         });
    });
}

function readdir(path) {
    return new Promise((resolve, reject) => {
         fs.readdir(path, function(err, files) {
             if (err)   reject(err);
             else       resolve(files);
         });
    });
}

var copyFile = async(function*(dst, src) {
    let c = yield readFile(src);
    yield writeFile(dst, c);
});

var __mkdirp = function(file, callback) {
    fs.mkdir(file, function(err) {
        if (! err) {
            callback(null);
        } else if (err.code == 'ENOENT') {
            __mkdirp(path.dirname(file), function(err) {
                if (err)
                    callback(err);
                else
                    __mkdirp(file, callback);
            });
        } else {
            fs.stat(file, function(err, result) {
                if (err || (! result.isDirectory()))
                    callback(err || new Error('file exits'));
                else
                    callback(null);
            });
        }
    });
};

var mkdirp = function(path) {
    return new Promise((resolve, reject) => {
        __mkdirp(path, (err) => {if (err) reject(err); else resolve(true);});
    });
};

// ----------------------------------------------------------------------------

const readline = require('readline');

function input(str) {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl.question(str, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// ----------------------------------------------------------------------------

exports.async = async;

exports.mkdirp = mkdirp;
exports.copyFile = copyFile;
exports.readdir = readdir;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.access = access;
exports.input = input;
