(function Event(Module, $core, $data, $elem, $regExpr, $valid) {
    var rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

    var eventTypes = {
        Mouse: ["click", "contextmenu", "dblclick", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseover", "mouseout", "mouseup", "onwheel"],
        Keyboard: ["keydown", "keypress", "keyup"],
        Page: ["abort", "beforeupload", "error", "hashchange", "load", "pageshow", "pagehide", "resize", "scroll", "unload"],
        Form: ["blur", "change", "focus", "focusin", "focusout", "input", "reset", "search", "select", "submit"],
        Print: ["afterprint", "beforeprint"]
    };

    var Event = function (src, props) {
        if (!(this instanceof Event)) {
            return new Event(src, props);
        }

        if (src && src.type) {
            this.originalEvent = src;
            this.type = src.type;
            //返回一个布尔值，表明当前事件是否调用了 event.preventDefault()方法。
            this.isDefaultPrevented = src.defaultPrevented ? true : false;

            this.target = src.target;
            this.currentTarget = src.currentTarget;
            this.relatedTarget = src.relatedTarget;
        }
        else {
            this.type = src;
        }

        if (props) {

        }
    };

    var specialEvents = {
        focusin: { bindType: "focus" },
        focusout: { bindType: "blur" },
        mouseenter: { bindType: "mouseover" },
        mouseleave: { bindType: "mouseout" },
        pointerenter: { bindType: "pointerover" },
        pointerleave: { bindType: "pointerout" }
    };

    var detachFun, attachFuc;

    var bindEvent = {
        detach: function (target, eventType, fn) {
            if (typeof eventType !== "string") {
                return;
            }
            eventType = eventType.toLowerCase();
            if (!detachFun) {
                if (target.removeEventListener) {
                    detachFun = function (eventType, fn) {
                        this.removeEventListener(eventType, fn);
                    }
                } else if (target.detachEvent) {
                    detachFun = function (eventType, fn) {
                        this.detachEvent('on' + eventType, fn);
                    }
                } else {
                    detachFun = function (eventType) {
                        this['on' + eventType] = null;
                    }
                }
            }
            detachFun.call(target, eventType, fn);
        },
        attach: function (target, eventType, fn) {
            if (typeof eventType !== "string") {
                return;
            }
            eventType = eventType.toLowerCase();
            
            if (!attachFuc) {
                if (target.addEventListener) {
                    attachFuc = function (eventType, fn) {
                        this.addEventListener(eventType, fn);
                    }
                } else if (target.attachEvent) {
                    attachFuc = function (eventType, fn) {
                        this.attachEvent('on' + eventType, fn);
                    }
                } else {
                    attachFuc = function (eventType, fn) {
                        this['on' + eventType] = fn;
                    }
                }
            }
            attachFuc.call(target, eventType, fn);
        }
    }

    var event = {
        add: function (elem, types, handler, data) {

            var handleObj, eventHandle, tmp, special,
                events, t, namespaces, origType, handlers,
                elemData = $data.get(elem);

            if (!$valid.isFunction(handler))
                return;

            if (!handler.guid) {
                handler.guid = $core.guid;
            }

            if (!(events = elemData.events)) {
                events = elemData.events = Object.create(null);
            }

            if (!(eventHandle = elemData.handle)) {
                eventHandle = elemData.handle = function (e) {
                    //dispatch events
                };
            }

            types = (types || "").match($regExpr.rnothtmlwhite) || [""];
            t = types.length;

            while (t--) {
                //["click.ns.ns1", "click", "ns.ns1", index: 0, input: "click.ns.ns1", groups: undefined]
                tmp = rtypenamespace.exec(types[t]) || [];
                type = origType = tmp[1];
                namespaces = (tmp[2] || "").split(".");

                if (!type) {
                    continue;
                }

                type = (special = specialEvents[type]) ? special.bindType : type;

                //如果是focusin,focusout,就应该转成
                handleObj.type = {
                    type: type,  //经过转换的类型
                    origType: origType,
                    data: data,
                    handler: handler,
                    guid: handler.guid,
                    namespaces: namespaces.join('.')
                };

                if (!(handlers = events[type])) {
                    events[type] = handlers = [];

                    if (special) {

                    }
                    else {
                        bindEvent.attach(elem, type, eventHandle);
                    }
                }

                handlers.push(handleObj);
            }
        },
        dispatch: function (nativeEvent) {
            var i, j, special,
                events = $data.get(this, "events"),
                args = new Array[arguments.length],
                e = event.fix(nativeEvent),
                handlers = events[e.type] || [],
                special = specialEvents[e.type] || {};

            args[0] = event;

        },
        fix: function (orgEvent) {
            return orgEvent && orgEvent instanceof Event ? orgEvent : new Event(orgEvent);
        }
    }

    Module.register("event", { event, Event });
}
)(Module, Module.require("core"), Module.require("data"), Module.require("element"), Module.require("regExpr"), Module.require("validate"));