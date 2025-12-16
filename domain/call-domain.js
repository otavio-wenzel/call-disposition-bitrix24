(function (global) {
    const App = global.App = global.App || {};
    App.domain = App.domain || {};

    function extractPhoneFromSubject(subject) {
        if (!subject) return '';
        const match = subject.match(/(\+?\d[\d\s\-\(\)]*\d)/);
        return match ? match[1].trim() : '';
    }

    function formatDurationMmSs(startIso, endIso) {
        if (!startIso || !endIso) return '-';
        const start = new Date(startIso);
        const end   = new Date(endIso);
        const diffMs = end - start;
        if (!isFinite(diffMs) || diffMs <= 0) return '-';
        const totalSeconds = Math.floor(diffMs / 1000);
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const ss = String(totalSeconds % 60).padStart(2, '0');
        return mm + ':' + ss;
    }

    function resolveContactAndPhone(activity) {
        let nomeContato = 'Contato não salvo';
        let telefone = '';

        const comms = Array.isArray(activity.COMMUNICATIONS) ? activity.COMMUNICATIONS : [];
        if (comms.length > 0) {
            const comm = comms[0];
            telefone = comm.VALUE || '';

            const hasEntity =
                comm.ENTITY_ID &&
                String(comm.ENTITY_ID) !== '0' &&
                String(comm.ENTITY_ID).trim() !== '';

            if (hasEntity) {
                if (comm.ENTITY_SETTINGS && typeof comm.ENTITY_SETTINGS === 'object') {
                    const es = comm.ENTITY_SETTINGS;
                    const parts = [];
                    if (es.HONORIFIC)   parts.push(es.HONORIFIC);
                    if (es.NAME)        parts.push(es.NAME);
                    if (es.SECOND_NAME) parts.push(es.SECOND_NAME);
                    if (es.LAST_NAME)   parts.push(es.LAST_NAME);
                    const fromSettings = parts.join(' ').trim();
                    if (fromSettings) {
                        nomeContato = fromSettings;
                    }
                }

                if (nomeContato === 'Contato não salvo') {
                    nomeContato =
                        comm.ENTITY_NAME ||
                        comm.TITLE ||
                        comm.NAME ||
                        nomeContato;
                }
            }
        }

        if (!telefone) {
            telefone = extractPhoneFromSubject(activity.SUBJECT || '');
        }
        if (!telefone && activity.SUBJECT) {
            telefone = activity.SUBJECT;
        }

        return { contactName: nomeContato, phone: telefone };
    }

    App.domain.extractPhoneFromSubject = extractPhoneFromSubject;
    App.domain.formatDurationMmSs      = formatDurationMmSs;
    App.domain.resolveContactAndPhone  = resolveContactAndPhone;
})(window);