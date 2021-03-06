(function Promise(Module, $valid, $callback) {

    var StatusCode = {
        Pending: "pending",     //待定,可能会转换为已实现或已拒绝状态
        fulfilled: "fulfilled", //当实现时,不得过渡到任何其他状态,必须具有一个值，该值不能更改
        rejected: "rejected"    //当被拒绝时,不得过渡到任何其他状态,必须有一个理由，不能改变
    }

    var timeOut = function (fn) {
        window.setTimeout(fn);
    }

    function Identity(v) {
        return v;
    }
    function Thrower(ex) {
        throw ex;
    }

    var _Promise = function (fn) {
        if (!$valid.isFunction(fn)) {
            return;
        }

        var self = this;
        self.status = StatusCode.Pending;
        self.fulFilledCallbacks = new $callback("once memory");
        self.rejectedCallbacks = new $callback("once memory");

        var _resolve = function () {
            self.fulFilledCallbacks.fireWith(self, arguments);
        }

        var _reject = function () {
            self.rejectedCallbacks.fireWith(self, arguments);
        }

        this.resolve = function (val) {
            timeOut(function () {
                if (self.status === StatusCode.Pending) {
                    self.status = StatusCode.fulfilled;
                    if (val && val.then) {
                        val.then(function (val) {
                            _resolve(val);
                        }, function (reanson) {
                            _reject(reason);
                        })
                    }
                    else {
                        _resolve(val);
                    }
                }
            });
        }

        this.reject = function (val) {
            timeOut(function () {
                if (self.status === StatusCode.Pending) {
                    self.status = StatusCode.rejected;
                    _reject(val);
                }
            });
        }

        try {
            fn(self.resolve, self.reject);
        }
        catch (reason) {
            this.reject(reason);
        }

        this.then = function (onFulfilled, onRejected) {
            onFulfilled = $valid.isFunction(onFulfilled) ? onFulfilled : Identity;
            onRejected = $valid.isFunction(onRejected) ? onRejected : Thrower;


            //如果同时调用resolvePromise和rejectPromise，或者对同一参数进行了多次调用，则第一个调用优先，而所有其他调用均被忽略
            function resolvePromise(promise, result, resolve, reject) {
                var then;
                // Support: Promises/A+ section 2.3.3.3.3 https://promisesaplus.com/#point-59
                // Ignore double-resolution attempts
                var thenCalledOrThrow = false;

                if (promise === result) {
                    return reject(new TypeError('Chaining cycle detected!'));
                }

                if ((result !== null) && ((typeof result === 'object') || (typeof result === 'function'))) {
                    try {
                        then = result.then;
                        if ($valid.isFunction(then)) {
                            then.call(result, function rs(value) {
                                if (thenCalledOrThrow) return;
                                thenCalledOrThrow = true;
                                return resolvePromise(promise, value, resolve, reject);
                            }, function rj(reason) {
                                if (thenCalledOrThrow) return;
                                thenCalledOrThrow = true;
                                return reject(reason);
                            });
                        } else {
                            return resolve(result);
                        }
                    } catch (reason) {
                        if (thenCalledOrThrow) return;
                        thenCalledOrThrow = true;
                        return reject(reason);
                    }
                } else {
                    return resolve(result);
                }
            }

            var nextPromise, self = this;
            switch (self.status) {
                case StatusCode.fulfilled:
                    nextPromise = new _Promise(function (resolve, reject) {
                        timeOut(function () {
                            try {
                                var result = this.fulFilledCallbacks.add(onFulfilled);
                                resolvePromise(nextPromise, result, resolve, reject);
                            }
                            catch (ex) {
                                reject(ex);
                            }
                        });
                    });
                    break;
                case StatusCode.rejected:
                    nextPromise = new _Promise(function (resolve, reject) {
                        timeOut(function () {
                            try {
                                var result = this.rejectedCallbacks.add(onRejected);
                                resolvePromise(nextPromise, result, resolve, reject);
                            }
                            catch (ex) {
                                reject(ex);
                            }
                        });
                    });
                    break;
                case StatusCode.Pending:
                    nextPromise = new _Promise(function (resolve, reject) {
                        self.fulFilledCallbacks.add(function (value) {
                            try {
                                var result = onFulfilled(value);
                                resolvePromise(nextPromise, result, resolve, reject);
                            } catch (reason) {
                                reject(reason);
                            }
                        })

                        self.rejectedCallbacks.add(function (reason) {
                            try {
                                var result = onRejected(reason);
                                resolvePromise(nextPromise, result, resolve, reject);
                            } catch (reason) {
                                reject(reason);
                            }
                        })
                    });
                    break;
            }
            return nextPromise;
        }

        this.catch = function (onRejected) {
            return this.then(undefined, onRejected);
        }

        this.finally = function (fn) {
            return this.then(function (v) {
                timeOut(fn);
                return v;
            }, function (reason) {
                timeOut(fn);
                throw reason;
            })
        }

        this.delay = function (duration) {
            return this.then(function (value) {
                return new _Promise(function (resolve, reject) {
                    timeout(function () {
                        resolve(value)
                    }, duration)
                })
            }, function (reason) {
                return new _Promise(function (resolve, reject) {
                    timeout(function () {
                        reject(reason)
                    }, duration)
                })
            })
        }
    }

    _Promise.resolve = function (value) {
        if (value instanceof _Promise) {
            return value;
        }
        return new _Promise(function (resolve) {
            resolve(value);
        });
    }

    _Promise.reject = function (value) {
        return new _Promise(function (resolve, reject) {
            reject(value);
        });
    }

    _Promise.all = function (promises) {
        return new _Promise(function (resolve, reject) {
            var results = [];
            var length = promises.length;
            var putRes = function (promise, i, results) {
                _Promise.resolve(promise).then(
                    function (res) {
                        results[i] = (res);
                        if (results.length === length) {
                            resolve(results);
                        }
                    }, function (err) {
                        reject(err);
                    }
                );
            }
            for (var i = 0; i < promises.length; i++) {
                var promise = promises[i];
                putRes(promise, i, results);
            }
        })
    }

    _Promise.race = function (promises) {
        return new _Promise(function (resolve, reject) {
            for (var i = 0; i < promises.length; i++) {
                _Promise.resolve(promises[i]).then(function (value) {
                    return resolve(value);
                }, function (reason) {
                    return reject(reason);
                })
            }
        })
    }

    Module.register("promise", _Promise);

})(Module, Module.require("validate"), Module.require("callback"));