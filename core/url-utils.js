(function (global) {
    const App = global.App = global.App || {};
    const log = App.log || function(){};

    /**
     * Quando rodando em app/app.html:
     *  - APP_BASE_URL  = .../app/
     *  - ROOT_BASE_URL = .../   (um nível acima)
     */
    function getBaseUrls() {
        const full = window.location.href.split('#')[0].split('?')[0];
        const idx  = full.lastIndexOf('/');

        // Ex: .../app_local/hash/app/app.html  -> .../app_local/hash/app/
        const appBase = full.substring(0, idx + 1);

        // tira a barra final para subir um nível
        const noSlash = appBase.endsWith('/')
            ? appBase.slice(0, -1)
            : appBase;

        const idx2 = noSlash.lastIndexOf('/');

        // Ex: .../app_local/hash/app -> .../app_local/hash/
        const rootBase = noSlash.substring(0, idx2 + 1);

        return { appBase, rootBase };
    }

    const bases = getBaseUrls();

    App.config.APP_BASE_URL   = bases.appBase;   // .../app/
    App.config.ROOT_BASE_URL  = bases.rootBase;  // .../

    // handler principal (index bootstrap)
    App.config.handlerUrl   = bases.rootBase + 'index.html';
    // background worker
    App.config.bgHandlerUrl = bases.rootBase + 'background/background.html';

    App.getBaseUrl = function () { return App.config.APP_BASE_URL; };
    App.getHandlerUrls = function () {
        return {
            handlerUrl:   App.config.handlerUrl,
            bgHandlerUrl: App.config.bgHandlerUrl
        };
    };

    log('[INIT] APP_BASE_URL  = ' + App.config.APP_BASE_URL);
    log('[INIT] ROOT_BASE_URL = ' + App.config.ROOT_BASE_URL);
    log('[INIT] handlerUrl    = ' + App.config.handlerUrl);
    log('[INIT] bgHandlerUrl  = ' + App.config.bgHandlerUrl);
})(window);