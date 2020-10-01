
jsDom.isReady = false;

function completed() {
    jsDom.isReady = true;
    document.removeEventListener("DOMContentLoaded", completed);
    window.removeEventListener("load", completed);
    console.log("complete");
}

jsDom.ready = function () {
    switch (document.readyState) {
        case "loading":
            // document 仍在加载
            document.addEventListener("DOMContentLoaded", completed);
            window.addEventListener("load", completed);
            break;
        default:
            break;
    }
}

document.onreadystatechange = function () {
    switch (document.readyState) {
        case "loading":
            // document 仍在加载
            document.addEventListener("DOMContentLoaded", completed, false);
            window.addEventListener("load", completed, false);
            console.log("onreadystatechange loading");
            break;
        case "interactive":
            // =DOMContentLoaded 文档已被解析，"正在加载"状态结束，但是诸如图像，样式表和框架之类的子资源仍在加载
            console.log("onreadystatechange interactive");
            break;
        case "complete":
            // =load 文档和所有子资源已完成加载。表示 load 状态的事件即将被触发
            console.log("onreadystatechange complete");
            break;
    }
}

jsDom.ready();