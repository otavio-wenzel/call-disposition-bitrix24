(function (global) {
    const App = global.App = global.App || {};

    App.ui.refs = {
        logEl:              document.getElementById('log'),
        logCardEl:          document.getElementById('log-card'),
        appHeaderEl:        document.getElementById('app-header'),
        adminBlockEl:       document.getElementById('admin-block'),

        lastCallTextEl:     document.getElementById('last-call-text'),
        currentCallTitleEl: document.getElementById('current-call-title'),
        btnRefreshLast:     document.getElementById('btn-refresh-last'),
        btnSaveResult:      document.getElementById('btn-save-result'),
        selectResult:       document.getElementById('call-result'),
        btnRegisterBg:      document.getElementById('btn-register-bg'),
        callsTableBody:     document.querySelector('#calls-table tbody'),
        btnPrevPage:        document.getElementById('btn-prev-page'),
        btnNextPage:        document.getElementById('btn-next-page'),
        pageIndicator:      document.getElementById('page-indicator'),
        bgStatusEl:         document.getElementById('bg-status')
    };
})(window);