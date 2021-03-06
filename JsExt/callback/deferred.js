(function Deferred(Module, $callback, $valid) {

    this.StatusCode = {
        Pending: "pending",     //待定,可能会转换为已实现或已拒绝状态
        fulfilled: "fulfilled", //当实现时,不得过渡到任何其他状态,必须具有一个值，该值不能更改
        rejected: "rejected"    //当被拒绝时,不得过渡到任何其他状态,必须有一个理由，不能改变
    }

    function Identity(v) {
        return v;
    }

    function Thrower(ex) {
        throw ex;
    }

    function Deferred(func) {

        var state = StatusCode.Pending;

        var fulFilledCallbacks = new $callback("once memory"),
            rejectedCallbacks = new $callback("once memory"),
            notifyCallbacks = new $callback("memory"),
            fulFilledFuns = new $callback("once memory"),
            rejectedFuns = new $callback("once memory"),
            notifyFuns = new $callback("memory");

        this.done = fulFilledCallbacks.add;
        this.fail = rejectedCallbacks.add;
        this.notify = notifyCallbacks.add;

        this.resolveWith = fulFilledCallbacks.fireWith;
        this.rejectWith = rejectedCallbacks.fireWith;
        this.notifyWith = notifyCallbacks.fireWith;

        fulFilledCallbacks.add(
            rejectedCallbacks.disable,
            rejectedFuns.disable,
            notifyCallbacks.lock,
            notifyFuns.lock,
            fulFilledFuns.fire);

        rejectedCallbacks.add(
            fulFilledCallbacks.disable,
            fulFilledFuns.disable,
            notifyCallbacks.lock,
            notifyFuns.lock,
            rejectedFuns.fire);

        notifyCallbacks.add(notifyFuns.fire);

        this.state = function () {
            return state;
        }

        this.catch = function (fn) {
            then(null, fn);
        }

        this.always = function () {
            this.done(arguments).fail(arguments);
            return this;
        }

        this.resolve = function () {
            if (state === StatusCode.Pending) {
                state = StatusCode.fulfilled;
            }
            this.resolveWith(this, arguments);
        }

        this.reject = function () {
            if (state === StatusCode.Pending) {
                state = StatusCode.rejected;
            }
            this.rejectWith(this, arguments);
        }

        this.notify = function () {
            this.notifyWith(this, arguments);
        }

        this.then = function (onFulFilled, onRejected, onProgress) {
            //避免同时调用，只有最先到达的有效
            var maxDepth = 0;

            function resolve(depth, deferred, handler, special) {
                return function () {
                    var that = this,
                        args = arguments,
                        mightThrow = function () {
                            var returned, then;

                            if (depth < maxDepth) {
                                return;
                            }

                            returned = handler.apply(that, args);

                            if (returned === this) {
                                throw new TypeError("Thenable self");
                            }

                            then = returned &&
                                (typeof returned === "object" ||
                                    $valid.isFunction(returned)) &&
                                returned.then;

                            if ($valid.isFunction(then)) {
                                if (special) {
                                    then.call(
                                        returned,
                                        resolve(maxDepth, deferred, Identity, special),
                                        resolve(maxDepth, deferred, Thrower, special));
                                }
                                else {
                                    maxDepth++;
                                    then.call(returned,
                                        resolve(maxDepth, deferred, Identity, special),
                                        resolve(maxDepth, deferred, Thrower, special),
                                        resolve(maxDepth, deferred, Identity, deferred.notifyWith)
                                    );
                                }
                            }
                            else {
                                if (handler !== Identity) {
                                    that = undefined;
                                    args = [returned];
                                }
                                (special || deferred.resolveWith)(that, args);
                            }
                        },
                        process = special ?
                            mightThrow :
                            function () {
                                try {
                                    mightThrow();
                                }
                                catch (e) {
                                    if (depth + 1 >= maxDepth) {
                                        if (handler !== maxDepth) {
                                            that = undefined;
                                            args = [e];
                                        }

                                        deferred.rejectWith(that, args);
                                    }
                                }
                            };

                    if (depth) {
                        process();
                    }
                    else {
                        window.setTimeout(process);
                    }
                }
            };

            return new Deferred(function (newDefer) {
                fulFilledFuns.add(
                    resolve(0,
                        newDefer,
                        $valid.isFunction(onFulFilled) ? onFulFilled : Identity)
                );
                rejectedFuns.add(
                    resolve(0,
                        newDefer,
                        $valid.isFunction(onRejected) ? onRejected : Thrower));
                notifyFuns.add(
                    resolve(0,
                        newDefer,
                        $valid.isFunction(onProgress) ? onProgress : Identity,
                        newDefer.notifyWith));
            });
        }

        if (func && $valid.isFunction(func)) {
            func.call(this, this);
        }

        return this;
    }

    Module.register("deferred", Deferred);

})(Module, Module.require("callback"), Module.require("validate"));