/**
 * Polyfills minimaux pour Sunmi V2 Pro (Android 7.1 / Chrome 51–59).
 * Chargé en beforeInteractive — doit rester en ES5 syntax.
 */
(function () {
  if (typeof window === 'undefined') return;

  // AbortController (absent avant Chrome 66)
  if (typeof AbortController === 'undefined') {
    window.AbortController = function () {
      this.signal = {
        aborted: false,
        onabort: null,
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () {
          return false;
        },
      };
      this.abort = function () {
        this.signal.aborted = true;
        if (typeof this.signal.onabort === 'function') {
          try {
            this.signal.onabort();
          } catch (e) {}
        }
      };
    };
  }

  if (typeof AbortSignal === 'undefined') {
    window.AbortSignal = {};
  }

  // AbortSignal.timeout (login + API client) — absent avant Chrome 103
  if (typeof AbortSignal.timeout !== 'function') {
    AbortSignal.timeout = function (ms) {
      var controller = new AbortController();
      setTimeout(function () {
        try {
          controller.abort();
        } catch (e) {}
      }, ms);
      return controller.signal;
    };
  }

  // globalThis
  if (typeof globalThis === 'undefined') {
    window.globalThis = window;
  }

  // Object.assign
  if (typeof Object.assign !== 'function') {
    Object.assign = function (target) {
      if (target == null) throw new TypeError('Cannot convert undefined or null to object');
      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var next = arguments[i];
        if (next != null) {
          for (var key in next) {
            if (Object.prototype.hasOwnProperty.call(next, key)) {
              to[key] = next[key];
            }
          }
        }
      }
      return to;
    };
  }

  // Array.prototype.includes
  if (!Array.prototype.includes) {
    Array.prototype.includes = function (search, start) {
      var o = Object(this);
      var len = parseInt(o.length, 10) || 0;
      if (len === 0) return false;
      var n = parseInt(start, 10) || 0;
      var k = n >= 0 ? n : Math.max(len + n, 0);
      while (k < len) {
        if (o[k] === search || (search !== search && o[k] !== o[k])) return true;
        k++;
      }
      return false;
    };
  }

  // String.prototype.includes
  if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
      if (typeof search !== 'string') search = String(search);
      return this.indexOf(search, start || 0) !== -1;
    };
  }

  // String.prototype.startsWith
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (search, pos) {
      return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
    };
  }

  // Promise.prototype.finally
  if (typeof Promise !== 'undefined' && Promise.prototype && !Promise.prototype.finally) {
    Promise.prototype.finally = function (callback) {
      var P = this.constructor;
      return this.then(
        function (value) {
          return P.resolve(callback()).then(function () {
            return value;
          });
        },
        function (err) {
          return P.resolve(callback()).then(function () {
            throw err;
          });
        }
      );
    };
  }

  try {
    document.documentElement.setAttribute('data-legacy-polyfills', '1');
  } catch (e) {}
})();
