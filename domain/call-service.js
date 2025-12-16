(function (global) {
    const App = global.App = global.App || {};
    const log = App.log || function(){};

    const PAGE_SIZE          = App.config.PAGE_SIZE;
    const CALL_LIST_TIMEOUT  = App.config.CALL_LIST_TIMEOUT_MS;
    const refs               = App.ui.refs || {};

    App.state.CURRENT_USER_ID = App.state.CURRENT_USER_ID || null;
    App.state.ACTIVITIES      = App.state.ACTIVITIES      || [];
    App.state.LAST_ACTIVITY   = App.state.LAST_ACTIVITY   || null;

    function setCurrentActivity(activity, fromList) {
        App.state.LAST_ACTIVITY = activity || null;
        App.renderCurrentActivity(App.state.LAST_ACTIVITY, !!fromList);
    }

    function loadLastCall() {
        const userId = App.state.CURRENT_USER_ID;
        if (!userId) {
            log('loadLastCall chamado sem CURRENT_USER_ID.');
            return;
        }

        if (App.state.isLoadingActivities) {
            log('loadLastCall ignorado: já existe requisição em andamento.');
            return;
        }

        App.state.isLoadingActivities = true;
        App.showLoadingLastCall(true);

        if (App.state.loadTimeoutId) {
            clearTimeout(App.state.loadTimeoutId);
            App.state.loadTimeoutId = null;
        }

        App.state.loadTimeoutId = setTimeout(function () {
            if (!App.state.isLoadingActivities) return;
            log('TIMEOUT: crm.activity.list não respondeu em 10s.');
            App.state.isLoadingActivities = false;
            App.showLoadingLastCall(false);
            setCurrentActivity(null, false);
            App.renderActivitiesTable([], 0, PAGE_SIZE);
        }, CALL_LIST_TIMEOUT);

        log('Buscando últimas CALLs concluídas. USER_ID = ' + userId + ' ...');

        BX24.callMethod(
            'crm.activity.list',
            {
                order: { END_TIME: 'DESC' },
                filter: {
                    TYPE_ID: 2,
                    COMPLETED: 'Y',
                    RESPONSIBLE_ID: userId
                },
                select: [
                    'ID', 'SUBJECT', 'START_TIME', 'END_TIME',
                    'RESPONSIBLE_ID', 'DESCRIPTION', 'COMMUNICATIONS'
                ]
            },
            function (result) {
                try {
                    if (App.state.loadTimeoutId) {
                        clearTimeout(App.state.loadTimeoutId);
                        App.state.loadTimeoutId = null;
                    }

                    App.state.isLoadingActivities = false;
                    App.showLoadingLastCall(false);

                    if (!result) {
                        log('crm.activity.list retornou result vazio/undefined');
                        setCurrentActivity(null, false);
                        App.renderActivitiesTable([], 0, PAGE_SIZE);
                        return;
                    }

                    if (typeof result.error === 'function' && result.error()) {
                        log('crm.activity.list ERRO', result.error());
                        setCurrentActivity(null, false);
                        App.renderActivitiesTable([], 0, PAGE_SIZE);
                        return;
                    }

                    const data = (typeof result.data === 'function') ? (result.data() || []) : [];
                    log('crm.activity.list SUCESSO. qtd=' + data.length);

                    App.state.ACTIVITIES   = data;
                    App.state.currentPage  = 0;

                    if (data.length > 0) {
                        setCurrentActivity(data[0], false);
                    } else {
                        setCurrentActivity(null, false);
                    }

                    App.renderActivitiesTable(
                        App.state.ACTIVITIES,
                        App.state.currentPage,
                        PAGE_SIZE
                    );
                } catch (e) {
                    log('EXCEPTION no callback crm.activity.list', e && e.message ? e.message : e);
                    setCurrentActivity(null, false);
                    App.renderActivitiesTable([], 0, PAGE_SIZE);
                }
            }
        );
    }

    function saveCallResult() {
        const activity = App.state.LAST_ACTIVITY;
        if (!activity) {
            alert('Nenhuma ligação encontrada para classificar.');
            return;
        }

        const selectResult = refs.selectResult;
        if (!selectResult) {
            log('saveCallResult: selectResult não encontrado em App.ui.refs');
            alert('Não foi possível localizar o campo de resultado da chamada.');
            return;
        }

        const val = selectResult.value;
        if (!val) {
            alert('Selecione um resultado para a chamada.');
            return;
        }

        log('Atualizando crm.activity.update ID=' + activity.ID + ' ...');
        BX24.callMethod(
            'crm.activity.update',
            {
                id: activity.ID,
                fields: { DESCRIPTION: val }
            },
            function (result) {
                if (result.error && result.error()) {
                    log('crm.activity.update ERRO', result.error());
                    alert('Erro ao salvar resultado. Veja o log.');
                    return;
                }
                log('crm.activity.update SUCESSO');
                alert('Resultado salvo com sucesso.');
                loadLastCall();
            }
        );
    }

    App.loadLastCall   = loadLastCall;
    App.saveCallResult = saveCallResult;
    App.setCurrentActivity = setCurrentActivity;
})(window);