(function (global) {
    const App = global.App = global.App || {};
    const log = App.log || function(){};

    function registerBackgroundWorker() {
        if (!App.state.IS_ADMIN) {
            log('[ADMIN] Tentativa de registrar PAGE_BACKGROUND_WORKER por usuário não admin.');
            alert('Você não tem permissão para registrar o background worker.');
            return;
        }

        const urls = App.getHandlerUrls();
        log('[ADMIN] Iniciando registro do PAGE_BACKGROUND_WORKER...');
        log('[ADMIN] handlerUrl = ' + urls.handlerUrl);
        log('[ADMIN] bgHandlerUrl = ' + urls.bgHandlerUrl);

        const placementOptions = {
            ERROR_HANDLER_URL: urls.handlerUrl,
            errorHandlerUrl:   urls.handlerUrl
        };
        log('[ADMIN] placementOptions', placementOptions);

        BX24.callMethod(
            'placement.unbind',
            { PLACEMENT: 'PAGE_BACKGROUND_WORKER' },
            function (resUnbind) {
                if (resUnbind.error && resUnbind.error()) {
                    log('[ADMIN] placement.unbind PAGE_BACKGROUND_WORKER ERRO', resUnbind.error());
                } else {
                    log('[ADMIN] placement.unbind PAGE_BACKGROUND_WORKER SUCESSO');
                }

                BX24.callMethod(
                    'placement.bind',
                    {
                        PLACEMENT: 'PAGE_BACKGROUND_WORKER',
                        HANDLER: urls.bgHandlerUrl,
                        TITLE: 'Watcher de ligações (SDR)',
                        DESCRIPTION: 'Observa ligações concluídas e abre a tela de classificação.',
                        OPTIONS: placementOptions
                    },
                    function (resBind) {
                        if (resBind.error && resBind.error()) {
                            const err = resBind.error();
                            log('[ADMIN] placement.bind PAGE_BACKGROUND_WORKER ERRO', err);
                            alert('Erro ao registrar background worker:\n' + JSON.stringify(err));
                        } else {
                            log('[ADMIN] placement.bind PAGE_BACKGROUND_WORKER SUCESSO');
                            alert('Background worker registrado com sucesso.');
                        }
                    }
                );
            }
        );
    }

    App.registerBackgroundWorker = registerBackgroundWorker;
})(window);