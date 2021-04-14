/**
 * @typedef {Object} GlobalScope
 * @property {Window} win
 * @property {Document} doc
 * @property {Navigator} nav
 */

class EventModule {
  async start(scope, readinessCallback) {}

  async stop(scope) {}
}

class ExecModule {
  /**
   * @param {GlobalScope} scope
   * @return {Promise<{}>}
   */
  async exec(scope) {}
}

class Queue {
  /**
   * @param {string} name
   * @param {GlobalScope} scope
   * @param {function} readinessCallback
   */
  constructor(name, scope, readinessCallback) {
    this.name = name;
    this.readinessCallback = readinessCallback;
    this.scope = scope;
    this.queue = [];
  }

  /**
   * @param {ExecModule|EventModule} module
   * @param {number} [timeout]
   */
  add(module, timeout = 0) {
    if (!(module instanceof ExecModule) && !(module instanceof EventModule)) {
      throw Error("Module is not supported. One of ExecModule or EventModule instance is expected.")
    }
    this.queue.push({ module, timeout });
  }

  start() {
    let timeout = 0;
    const count = this.queue.length;
    const callback = this.readinessCallback;
    for (let i = 0; i < count; i++) {
      const { module } = this.queue[i];
      timeout += this.queue[i].timeout;
      this.queue[i].queuedId = setTimeout(() => {
        if (module instanceof ExecModule) {
          module.exec(this.scope)
            .then((params = {}) => callback(params));
        }
        if (module instanceof EventModule) {
          module.start(this.scope, callback);
        }
      }, timeout);
    }
  }

  stop() {
    const count = this.queue.length;
    for (let i = 0; i < count; i++) {
      if (this.queue[i].queuedId) {
        if (this.queue[i].module instanceof EventModule) {
          this.queue[i].module.stop(this.scope);
        }
        clearTimeout(this.queue[i].queuedId);
      }
    }
  }
}

class CopyPasteEventModule extends EventModule {
  async start(scope, readinessCallback) {
    const { win } = scope;

    win.addEventListener('paste', readinessCallback);
    win.addEventListener('copy', readinessCallback);

    return super.start(scope, readinessCallback);
  }

  async stop(scope) {
    const { win } = scope;

    win.removeEventListener('paste', readinessCallback);
    win.removeEventListener('copy', readinessCallback);

    return super.stop();
  }
}

class FontsDetectionModule extends ExecModule {
  async exec(scope) {
    // this method need to be implemented
    return super.exec(scope);
  }
}

(async (win, doc, nav) => {
  /**
   * @param {Object} params
   */
  const callback = function (params = {}) {
    console.log("Params were fetched from module", params);
  };

  const qe = new Queue("events", { win, doc, nav }, callback);
  qe.add(new CopyPasteEventModule(), 2000);
  qe.start();

  const qd = new Queue("data", { win, doc, nav }, callback);
  qd.add(new FontsDetectionModule(), 1000);
  qd.start();

})(window, document, navigator);
