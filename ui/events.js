(function (global) {
    const App  = global.App = global.App || {};
    const refs = App.ui.refs;

    // Botões principais
    refs.btnRefreshLast.addEventListener('click', function () {
        App.loadLastCall();
    });

    refs.btnSaveResult.addEventListener('click', function () {
        App.saveCallResult();
    });

    refs.btnRegisterBg.addEventListener('click', function () {
        App.registerBackgroundWorker();
    });

    // Paginação
    refs.btnPrevPage.addEventListener('click', function (ev) {
        ev.preventDefault();
        const current = App.state.currentPage || 0;
        if (current > 0) {
            App.state.currentPage = current - 1;
            App.renderActivitiesTable(
                App.state.ACTIVITIES,
                App.state.currentPage,
                App.state.PAGE_SIZE || 10
            );
        }
    });

    refs.btnNextPage.addEventListener('click', function (ev) {
        ev.preventDefault();
        const total   = App.state.ACTIVITIES.length;
        const pageSize = App.state.PAGE_SIZE || 10;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const current = App.state.currentPage || 0;

        if (current < totalPages - 1) {
            App.state.currentPage = current + 1;
            App.renderActivitiesTable(
                App.state.ACTIVITIES,
                App.state.currentPage,
                pageSize
            );
        }
    });

    // Clique na linha da tabela
    App.onActivityRowClick = function (idx) {
        const acts = App.state.ACTIVITIES || [];
        const act  = acts[idx];
        App.state.LAST_ACTIVITY = act || null;
        App.renderCurrentActivity(App.state.LAST_ACTIVITY, true);
    };
})(window);