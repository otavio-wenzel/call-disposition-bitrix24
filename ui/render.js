(function (global) {
    const App   = global.App = global.App || {};
    const log   = App.log || function(){};
    const refs  = App.ui.refs;
    const dom   = App.domain;

    const TITLE_LAST     = 'Última ligação concluída:';
    const TITLE_SELECTED = 'Ligação selecionada:';

    App.state.PAGE_SIZE      = App.state.PAGE_SIZE || App.config.PAGE_SIZE;
    App.state.currentPage    = App.state.currentPage || 0;
    App.state.ACTIVITIES     = App.state.ACTIVITIES || [];
    App.state.LAST_ACTIVITY  = App.state.LAST_ACTIVITY || null;
    App.state.IS_ADMIN       = App.state.IS_ADMIN || false;

    // Aplica o status no <select> com base na DESCRIPTION
    function applyStatusFromDescription(activity) {
        if (!activity) {
            refs.selectResult.value = '';
            return;
        }
        const desc = (activity.DESCRIPTION || '').trim();
        if (!desc) {
            refs.selectResult.value = '';
            return;
        }

        let chosen = '';
        const opts = Array.from(refs.selectResult.options).map(o => o.value);

        for (const v of opts) {
            if (!v) continue;
            if (desc === v) {
                chosen = v;
                break;
            }
        }
        if (!chosen) {
            for (const v of opts) {
                if (!v) continue;
                if (desc.toUpperCase().includes(v.toUpperCase())) {
                    chosen = v;
                    break;
                }
            }
        }
        refs.selectResult.value = chosen;
    }

    function renderCurrentActivity(activity, fromList) {
        if (!activity) {
            refs.lastCallTextEl.textContent =
                'Nenhuma chamada concluída encontrada para este usuário.';
            refs.selectResult.value = '';
            refs.currentCallTitleEl.textContent = TITLE_LAST;
            return;
        }

        const info = dom.resolveContactAndPhone(activity);
        refs.lastCallTextEl.textContent = `${info.contactName} | ${info.phone}`;

        applyStatusFromDescription(activity);
        refs.currentCallTitleEl.textContent = fromList ? TITLE_SELECTED : TITLE_LAST;
    }

    function showLoadingLastCall(isLoading) {
        if (isLoading) {
            refs.lastCallTextEl.textContent = 'carregando...';
            refs.btnRefreshLast.disabled = true;
        } else {
            refs.btnRefreshLast.disabled = false;
        }
    }

    function renderActivitiesTable(activities, currentPage, pageSize) {
        const tbody = refs.callsTableBody;
        tbody.innerHTML = '';

        const total = activities.length;
        log('renderActivitiesTable: total atividades = ' + total);

        if (!total) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 5;
            td.textContent = 'Nenhuma chamada encontrada.';
            tr.appendChild(td);
            tbody.appendChild(tr);
            refs.pageIndicator.textContent = '0 / 0';
            refs.btnPrevPage.disabled = true;
            refs.btnNextPage.disabled = true;
            return;
        }

        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage >= totalPages) currentPage = totalPages - 1;
        App.state.currentPage = currentPage;

        const start = currentPage * pageSize;
        const end   = Math.min(start + pageSize, total);

        for (let i = start; i < end; i++) {
            const a = activities[i];
            const tr = document.createElement('tr');
            tr.dataset.index = String(i);

            const info = dom.resolveContactAndPhone(a);
            const dateStr = a.END_TIME
                ? new Date(a.END_TIME).toLocaleString('pt-BR')
                : '-';
            const durStr = dom.formatDurationMmSs(a.START_TIME, a.END_TIME);
            const statusStr = (a.DESCRIPTION || '').trim() || '-';

            const tdContato = document.createElement('td');
            tdContato.textContent = info.contactName;
            tdContato.className = 'col-contato';

            const tdNumero = document.createElement('td');
            tdNumero.textContent = info.phone;
            tdNumero.className = 'col-numero';

            const tdData = document.createElement('td');
            tdData.textContent = dateStr;
            tdData.className = 'col-data';

            const tdDur = document.createElement('td');
            tdDur.textContent = durStr;
            tdDur.className = 'col-dur';

            const tdStatus = document.createElement('td');
            tdStatus.textContent = statusStr;
            tdStatus.className = 'col-status';

            tr.appendChild(tdContato);
            tr.appendChild(tdNumero);
            tr.appendChild(tdData);
            tr.appendChild(tdDur);
            tr.appendChild(tdStatus);

            tr.addEventListener('click', function () {
                const idx = parseInt(this.dataset.index, 10);
                if (App.onActivityRowClick) {
                    App.onActivityRowClick(idx);
                }
            });

            tbody.appendChild(tr);
        }

        const totalPages2 = Math.max(1, Math.ceil(total / pageSize));
        refs.pageIndicator.textContent = (currentPage + 1) + ' / ' + totalPages2;
        refs.btnPrevPage.disabled = currentPage <= 0;
        refs.btnNextPage.disabled = currentPage >= totalPages2 - 1;
    }

    App.renderCurrentActivity  = renderCurrentActivity;
    App.showLoadingLastCall    = showLoadingLastCall;
    App.renderActivitiesTable  = renderActivitiesTable;
})(window);