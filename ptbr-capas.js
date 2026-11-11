
(function () {
    'use strict';

    var ID = 'LAMPA_PTBR_CAPAS_V2';
    if (window[ID]) return;
    window[ID] = true;

    var STORE = 'lampa_ptbr_verified_titles_v2';
    var BADGE = 'lampa-ptbr-cover-badge';
    var currentTitle = '';
    var initialized = false;

    function norm(value) {
        return String(value || '').toLowerCase()
            .replace(/_/g, '-')
            .replace(/[^a-z0-9à-ú-]+/g, ' ')
            .replace(/\s+/g, ' ').trim();
    }

    function read() {
        try {
            return JSON.parse(
                window.localStorage.getItem(STORE) || '[]'
            );
        } catch (e) {
            return [];
        }
    }

    function save(title) {
        if (!title) return;

        var items = read();
        var found = items.some(function (item) {
            return item.title === title;
        });

        if (!found) {
            items.push({ title: title });
        }

        try {
            window.localStorage.setItem(
                STORE,
                JSON.stringify(items.slice(-200))
            );
        } catch (e) {}

        scan();
    }

    function isPTBR(track) {
        var lang = norm(
            track.language || track.lang ||
            track.label || track.name
        );

        return /pt-br|ptbr|pob|por-br|brazilian|portugu[eê]s brasileiro|brasil/.test(lang);
    }

    function checkTracks() {
        try {
            if (!window.Lampa || !Lampa.PlayerVideo) return;

            var video = Lampa.PlayerVideo.video();
            if (!video || !video.audioTracks) return;

            for (var i = 0; i < video.audioTracks.length; i++) {
                if (isPTBR(video.audioTracks[i])) {
                    save(currentTitle);
                    return;
                }
            }
        } catch (e) {}
    }

    function css() {
        if (!document.head) return;

        var style = document.createElement('style');
        style.textContent =
            '.card__view{position:relative}' +
            '.' + BADGE + '{position:absolute;top:5px;left:5px;' +
            'z-index:99;background:#16833e;color:#fff;' +
            'padding:4px 6px;border-radius:4px;' +
            'font-size:10px;font-weight:bold;pointer-events:none}';

        document.head.appendChild(style);
    }

    function scan() {
        try {
            var items = read();
            var cards = document.querySelectorAll('.card');

            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                var title = card.querySelector('.card__title');
                var view = card.querySelector('.card__view');

                if (!title || !view) continue;

                var name = norm(title.textContent);
                var found = items.some(function (item) {
                    return item.title === name;
                });

                var old = view.querySelector('.' + BADGE);

                if (found && !old) {
                    var badge = document.createElement('span');
                    badge.className = BADGE;
                    badge.textContent = '🇧🇷 DUBLADO PT-BR';
                    view.appendChild(badge);
                }

                if (!found && old && old.parentNode) {
                    old.parentNode.removeChild(old);
                }
            }
        } catch (e) {}
    }

    function init() {
        if (initialized) return;
        initialized = true;

        css();

        try {
            if (Lampa.Player && Lampa.Player.listener) {
                Lampa.Player.listener.follow('start', function () {
                    var title = document.querySelector(
                        '.full-start__title, .full-start-new__title'
                    );

                    currentTitle = title ? norm(title.textContent) : '';
                    window.setTimeout(checkTracks, 1500);
                });

                Lampa.Player.listener.follow('destroy', function () {
                    currentTitle = '';
                });
            }

            if (Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
                ['canplay', 'tracks', 'timeupdate'].forEach(function (event) {
                    Lampa.PlayerVideo.listener.follow(event, checkTracks);
                });
            }
        } catch (e) {}

        if (window.MutationObserver && document.body) {
            try {
                var observer = new window.MutationObserver(scan);
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            } catch (e) {}
        }

        scan();
        console.log('[PTBR CAPAS V2] Ativo');
    }

    function ready() {
        if (!window.Lampa) {
            window.setTimeout(ready, 1000);
            return;
        }

        if (window.appready) {
            init();
            return;
        }

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('app', function (event) {
                if (event.type === 'ready') init();
            });
        } else {
            window.setTimeout(ready, 1000);
        }
    }

    ready();
})();

(function () {
    'use strict';

    var ID = 'lampa_ptbr_audio_v2';

    if (window[ID]) return;
    window[ID] = true;

    var enabled = true;
    var priority = 'ptbr';
    var active = false;
    var selected = false;

    function readSettings() {
        try {
            enabled = Lampa.Storage.field('ptbr_audio_enabled') !== false;
            priority = Lampa.Storage.field('ptbr_audio_priority') || 'ptbr';
        } catch (e) {}
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/_/g, '-')
            .trim();
    }

    function getLanguage(track) {
        return normalize(
            track.language ||
            track.lang ||
            track.label ||
            track.name
        );
    }

    function rank(track) {
        var lang = getLanguage(track);

        if (!lang) return 0;

        if (/pt-br|pob|por-br|brazil|brasileir/.test(lang)) return 30;
        if (/^pt$|^pt-|portugu|^por$/.test(lang)) return 20;
        if (/^en$|^en-|english|^eng$/.test(lang)) return 10;

        return 0;
    }

    function selectAudio() {
        if (!enabled || selected || !active) return;

        try {
            var video = Lampa.PlayerVideo.video();

            if (!video || !video.audioTracks) return;

            var tracks = video.audioTracks;
            var best = null;
            var bestRank = 0;

            for (var i = 0; i < tracks.length; i++) {
                var score = rank(tracks[i]);

                if (priority === 'ptbr') {
                    if (score > bestRank) {
                        bestRank = score;
                        best = tracks[i];
                    }
                } else if (priority === 'pt') {
                    var adjusted = score === 30 ? 20 : score;
                    if (adjusted > bestRank) {
                        bestRank = adjusted;
                        best = tracks[i];
                    }
                } else if (priority === 'en') {
                    var english = score === 10 ? 30 : score;
                    if (english > bestRank) {
                        bestRank = english;
                        best = tracks[i];
                    }
                }
            }

            if (!best) return;

            best.enabled = true;
            selected = true;

            console.log(
                '[Lampa PT-BR 2.0] Áudio selecionado:',
                getLanguage(best)
            );

        } catch (error) {
            console.log('[Lampa PT-BR] Erro:', error);
        }
    }

    function onStart() {
        active = true;
        selected = false;
    }

    function onDestroy() {
        active = false;
        selected = false;
    }

    function initSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: ID,
            name: 'Lampa PT-BR Audio',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05a4.5 4.5 0 0 0 2.5-4.02z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: ID,
            param: {
                name: 'ptbr_audio_enabled',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Seleção automática de áudio',
                description: 'Ativar ou desativar a seleção automática'
            },
            onChange: readSettings
        });

        Lampa.SettingsApi.addParam({
            component: ID,
            param: {
                name: 'ptbr_audio_priority',
                type: 'select',
                values: {
                    ptbr: 'Português brasileiro primeiro',
                    pt: 'Português primeiro',
                    en: 'Inglês primeiro'
                },
                default: 'ptbr'
            },
            field: {
                name: 'Idioma preferido'
            },
            onChange: readSettings
        });
    }

    function init() {
        if (!Lampa.Player || !Lampa.PlayerVideo) return;

        readSettings();
        initSettings();

        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);

        Lampa.PlayerVideo.listener.follow('canplay', selectAudio);
        Lampa.PlayerVideo.listener.follow('timeupdate', selectAudio);
        Lampa.PlayerVideo.listener.follow('tracks', selectAudio);

        console.log('[Lampa PT-BR Audio 2.0] Inicializado');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
(function () {
    'use strict';

    var ID = 'lampa_ptbr_audio_v2';

    if (window[ID]) return;
    window[ID] = true;

    var enabled = true;
    var prioridade = 'ptbr';
    var ativo = falso;
    var selecionado = falso;

    função readSettings() {
        tente {
            enabled = Lampa.Storage.field('ptbr_audio_enabled') !== false;
            prioridade = Lampa.Storage.field('ptbr_audio_priority') || 'ptbr';
        } catch (e) {}
    }

    função normalizar(valor) {
        retornar String(valor || '')
            .toLowerCase()
            .replace(/_/g, '-')
            .trim();
    }

    função getLanguage(track) {
        retornar normalizar(
            track.language ||
            track.lang ||
            track.label ||
            track.name
        );
    }

    função classificação(track) {
        var lang = getLanguage(faixa);

        se (!lang) retorne 0;

        se (/pt-br|pob|por-br|brazil|brasileir/.test(lang)) retorne 30;
        se (/^pt$|^pt-|portugu|^por$/.test(lang)) retorne 20;
        se (/^en$|^en-|english|^eng$/.test(lang)) retorne 10;

        retornar 0;
    }

    função selecionarÁudio() {
        se (!habilitado || selecionado || !ativo) retorne;

        tente {
            var vídeo = Lampa.PlayerVideo.video();

            se (!vídeo || !vídeo.faixas de áudio) retorne;

            var tracks = video.audioTracks;
            var melhor = nulo;
            var bestRank = 0;

            para (var i = 0; i < tracks.length; i++) {
                var score = rank(tracks[i]);

                se (prioridade === 'ptbr') {
                    se (pontuação > melhorClassificação) {
                        bestRank = pontuação;
                        best = tracks[i];
                    }
                } senão se (prioridade === 'pt') {
                    var ajustado = pontuação === 30 ? 20 : pontuação;
                    se (ajustado > melhorClassificação) {
                        bestRank = ajustado;
                        best = tracks[i];
                    }
                } else if (prioridade === 'en') {
                    var inglês = pontuação === 10 ? 30: pontuação;
                    se (inglês > melhorClassificação) {
                        bestRank = inglês;
                        best = tracks[i];
                    }
                }
            }

            Se (!melhor) retornar;

            best.enabled = true;
            selecionado = verdadeiro;

            console.log(
                '[Lâmpada PT-BR 2.0] Áudio selecionado:',
                getLanguage(best)
            );

        } catch (erro) {
            console.log('[Lâmpada PT-BR] Erro:', erro);
        }
    }

    função onStart() {
        ativo = verdadeiro;
        selecionado = falso;
    }

    função onDestroy() {
        ativo = falso;
        selecionado = falso;
    }

    função initSettings() {
        Se (!Lampa.SettingsApi) retornar;

        Lampa.SettingsApi.addComponent({
            componente: ID,
            Nome: 'Lampa PT-BR Audio',
            ícone: '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05a4.5 4.5 0 0 0 2.5-4.02z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            componente: ID,
            parâmetro: {
                nome: 'ptbr_audio_enabled',
                tipo: 'gatilho',
                padrão: verdadeiro
            },
            campo: {
                nome: 'Seleção automática de áudio',
                description: 'Ativar ou desativar a seleção automática'
            },
            onChange: readSettings
        });

        Lampa.SettingsApi.addParam({
            componente: ID,
            parâmetro: {
                nome: 'ptbr_audio_priority',
                tipo: 'selecionar',
                valores: {
                    ptbr: 'Português brasileiro primeiro',
                    pt: 'Português primeiro',
                    em: 'Inglês primeiro'
                },
                padrão: 'ptbr'
            },
            campo: {
                nome: 'Idioma preferido'
            },
            onChange: readSettings
        });
    }

    função init() {
        if (!Lampa.Player || !Lampa.PlayerVideo) return;

        readSettings();
        initSettings();

        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('destroy', onDestroy);

        Lampa.PlayerVideo.listener.follow('canplay', selectAudio);
        Lampa.PlayerVideo.listener.follow('timeupdate', selectAudio);
        Lampa.PlayerVideo.listener.follow('tracks', selectAudio);

        console.log('[Lâmpada PT-BR Áudio 2.0] Inicializado');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            se (event.type === 'ready') init();
        });
    }
})();
(function () {
    'use strict';

    var ID = 'lampa_ptbr_audio_v3';

    if (window[ID]) return;
    window[ID] = true;

    var enabled = true;
    var subtitlesEnabled = true;
    var active = false;
    var selected = false;
    var attached = false;

    function readSettings() {
        try {
            enabled = Lampa.Storage.field('ptbr_audio_enabled') !== false;
            subtitlesEnabled = Lampa.Storage.field('ptbr_subs_enabled') !== false;
        } catch (e) {}
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/_/g, '-')
            .trim();
    }

    function language(track) {
        return normalize(
            track.language ||
            track.lang ||
            track.label ||
            track.name ||
            track.title
        );
    }

    function isBrazilianPortuguese(track) {
        var lang = language(track);

        return /pt-br|por-br|pob|brazil|brasileir/.test(lang);
    }

    function isPortuguese(track) {
        var lang = language(track);

        return isBrazilianPortuguese(track) ||
            /^pt$|^pt-|^por$|portugu/.test(lang);
    }

    function getVideo() {
        try {
            return Lampa.PlayerVideo.video();
        } catch (e) {
            return null;
        }
    }

    function selectTracks() {
        if (!active || selected) return;

        var video = getVideo();

        if (!video) return;

        try {
            var audio = video.audioTracks;
            var subtitles = video.textTracks;

            var bestAudio = null;
            var bestAudioScore = 0;

            if (enabled && audio && audio.length) {
                for (var i = 0; i < audio.length; i++) {
                    var track = audio[i];

                    if (!isPortuguese(track)) continue;

                    var score = isBrazilianPortuguese(track) ? 2 : 1;

                    if (score > bestAudioScore) {
                        bestAudio = track;
                        bestAudioScore = score;
                    }
                }
            }

            // Primeiro tenta encontrar áudio em português.
            if (bestAudio) {
                bestAudio.enabled = true;
                selected = true;

                console.log('[PT-BR 3.0] Áudio selecionado:', language(bestAudio));
                return;
            }

            // Se não houver áudio em português, procura legenda.
            if (subtitlesEnabled && subtitles && subtitles.length) {
                var bestSubtitle = null;
                var bestSubtitleScore = 0;

                for (var j = 0; j < subtitles.length; j++) {
                    var sub = subtitles[j];

                    if (!isPortuguese(sub)) continue;

                    var subScore = isBrazilianPortuguese(sub) ? 2 : 1;

                    if (subScore > bestSubtitleScore) {
                        bestSubtitle = sub;
                        bestSubtitleScore = subScore;
                    }
                }

                if (bestSubtitle) {
                    bestSubtitle.mode = 'showing';
                    selected = true;

                    console.log('[PT-BR 3.0] Legenda selecionada:', language(bestSubtitle));
                }
            }
        } catch (e) {
            console.log('[PT-BR 3.0] Aguardando faixas:', e);
        }
    }

    function onTracks() {
        selectTracks();
    }

    function onSubs() {
        selectTracks();
    }

    function onCanPlay() {
        selectTracks();
    }

    function attachPlayerVideo() {
        if (attached || !Lampa.PlayerVideo) return;

        attached = true;

        Lampa.PlayerVideo.listener.follow('tracks', onTracks);
        Lampa.PlayerVideo.listener.follow('subs', onSubs);
        Lampa.PlayerVideo.listener.follow('canplay', onCanPlay);

        selectTracks();
    }

    function detachPlayerVideo() {
        if (!attached || !Lampa.PlayerVideo) return;

        Lampa.PlayerVideo.listener.remove('tracks', onTracks);
        Lampa.PlayerVideo.listener.remove('subs', onSubs);
        Lampa.PlayerVideo.listener.remove('canplay', onCanPlay);

        attached = false;
    }

    function onStart() {
        active = true;
        selected = false;
        attachPlayerVideo();
    }

    function onReady() {
        attachPlayerVideo();
    }

    function onDestroy() {
        active = false;
        selected = false;
        detachPlayerVideo();
    }

    function initSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: ID,
            name: 'Lampa PT-BR Audio 3.0',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: ID,
            param: {
                name: 'ptbr_audio_enabled',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Áudio automático PT-BR'
            },
            onChange: readSettings
        });

        Lampa.SettingsApi.addParam({
            component: ID,
            param: {
                name: 'ptbr_subs_enabled',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Legenda automática PT-BR',
                description: 'Usar legenda quando não encontrar áudio em português'
            },
            onChange: readSettings
        });
    }

    function init() {
        if (!Lampa.Player || !Lampa.PlayerVideo) return;

        readSettings();
        initSettings();

        Lampa.Player.listener.follow('start', onStart);
        Lampa.Player.listener.follow('ready', onReady);
        Lampa.Player.listener.follow('destroy', onDestroy);

        console.log('[Lampa PT-BR Audio 3.0] Inicializado');
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    }
})();
