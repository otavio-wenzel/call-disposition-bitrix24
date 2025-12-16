(function (global) {
    const App = global.App = global.App || {};

    App.state  = App.state  || {};
    App.ui     = App.ui     || {};
    App.domain = App.domain || {};
    App.config = App.config || {};

    App.config.PAGE_SIZE = App.config.PAGE_SIZE || 10;
    App.config.CALL_LIST_TIMEOUT_MS = App.config.CALL_LIST_TIMEOUT_MS || 10000;
    App.config.BG_POLL_INTERVAL_MS = App.config.BG_POLL_INTERVAL_MS || 3000;
})(window);