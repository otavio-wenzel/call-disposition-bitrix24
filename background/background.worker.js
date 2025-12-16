(function () {
    const App = window.App = window.App || {};
    const log = App.log || function(){};

    let CURRENT_USER_ID = null;
    let lastActivityId  = null;
    let pollTimer       = null;

    function bgLog(msg, data) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0');
        const mm = String(now.getMinutes()).padStart(2,'0');
        const ss = String(now.getSeconds()).padStart(2,'0');
        let line = `[BG ${hh}:${mm}:${ss}] ${msg}`;
        if (data !== undefined) {
            try {
                line += ' ' + JSON.stringify(data);
            } catch(e) {
                line += ' ' + String(data);
            }
        }
        console.log(line);
        log(line);
    }

    function pollLastCall() {
        if (!CURRENT_USER_ID) {
            bgLog('pollLastCall chamado sem CURRENT_USER_ID.');
            return;
        }

        bgLog('Background: consultando crm.activity.list para última CALL concluída...');

        BX24.callMethod(
            'crm.activity.list',
            {
                order: { END_TIME: 'DESC' },
                filter: {
                    TYPE_ID: 2,
                    COMPLETED: 'Y',
                    RESPONSIBLE_ID: CURRENT_USER_ID
                },
                select: [ 'ID', 'END_TIME', 'SUBJECT', 'RESPONSIBLE_ID' ]
            },
            function(result) {
                if (result.error && result.error()) {
                    bgLog('crm.activity.list (BG) ERRO', result.error());
                    return;
                }
                const data = result.data();
                if (!data || !data.length) {
                    bgLog('crm.activity.list (BG) sem resultados.');
                    return;
                }

                const latest   = data[0];
                const latestId = parseInt(latest.ID, 10);

                if (lastActivityId === null) {
                    lastActivityId = latestId;
                    bgLog('BG inicializou lastActivityId=' + lastActivityId);
                    return;
                }

                if (latestId !== lastActivityId) {
                    bgLog('BG detectou nova ligação concluída ID=' + latestId +
                          ' (antes era ' + lastActivityId + '). Abrindo aplicação...');

                    lastActivityId = latestId;

                    try {
                        BX24.openApplication();
                    } catch(e) {
                        bgLog('Erro ao chamar BX24.openApplication', String(e));
                    }
                }
            }
        );
    }

    BX24.init(function() {
        bgLog('Background worker carregado, iniciando BX24.init...');
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error && res.error()) {
                bgLog('user.current (BG) ERRO', res.error());
                return;
            }
            const user = res.data();
            CURRENT_USER_ID = parseInt(user.ID, 10);
            bgLog('user.current (BG) SUCESSO. USER_ID=' + CURRENT_USER_ID, user);

            pollLastCall();
            pollTimer = setInterval(pollLastCall, 3000);
        });
    });
})();