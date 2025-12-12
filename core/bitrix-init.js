(function (global) {
    const App  = global.App = global.App || {};
    const log  = App.log || function(){};
    const refs = App.ui.refs;

    BX24.init(function() {
        log('BX24.init OK. Pronto para usar API.');
        BX24.callMethod('user.current', {}, function(res) {
            if (res.error && res.error()) {
                log('user.current ERRO', res.error());
                return;
            }
            const user = res.data();
            App.state.CURRENT_USER_ID = parseInt(user.ID, 10);

            log('user.current SUCESSO, ID=' + App.state.CURRENT_USER_ID, {
                ID: user.ID,
                NAME: user.NAME,
                LAST_NAME: user.LAST_NAME,
                UF_PHONE_INNER: user.UF_PHONE_INNER
            });

            try {
                if (typeof BX24.isAdmin === 'function') {
                    App.state.IS_ADMIN = !!BX24.isAdmin();
                } else if (user && (user.ADMIN === true || user.IS_ADMIN === 'Y')) {
                    App.state.IS_ADMIN = true;
                } else {
                    App.state.IS_ADMIN = false;
                }
            } catch (e) {
                App.state.IS_ADMIN = false;
            }
            log('IS_ADMIN = ' + App.state.IS_ADMIN);

            if (refs.appHeaderEl) {
                const nome = user.NAME || '';
                const sobrenome = user.LAST_NAME || '';
                const fullName = (nome + ' ' + sobrenome).trim();
                refs.appHeaderEl.textContent =
                    'Classificação de Ligações' +
                    (fullName ? ' - ' + fullName : '');
            }

            if (!App.state.IS_ADMIN) {
                if (refs.adminBlockEl) refs.adminBlockEl.style.display = 'none';
                if (refs.logCardEl)   refs.logCardEl.style.display    = 'none';
                log('Blocos de administração e log ocultos para usuário não admin.');
            } else {
                log('Blocos de administração e log visíveis (usuário admin).');
            }

            App.loadLastCall();
        });
    });
})(window);