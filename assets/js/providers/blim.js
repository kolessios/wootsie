class Blim extends BaseProvider
{
	/**
	 * Constructor
	 */
	constructor() {
		super();

		this.name		= 'Blim';
		this.logo 		= 'blim.jpg';
		this.baseUrl	= 'http://www.blim.com';
		this.viewUrl	= '/player';
	}

	/**
	 * Objeto del <video>
	 */
	video() {
		return $('blim-player-media video').get(0);
	}

	/**
	 * Devuelve la ID del Stream
	 */
	getId() {
		var split = document.location.href.split('/');
		if ( typeof split[4] == 'undefined' ) return null;
		return split[4];
	}

	/**
	 * Devuelve el título del Stream
	 */
	getTitle() {
		// Titulos
		var media		= $('.blim-player-title-bar__title').text().trim();
		//var subtitle	= $('.controls-title-wrapper span.ng-binding').first().next().text();
		var chapter		= $('.blim-player-title-bar__episode-number').text().trim();

		if ( media.length == 0 ) return null;

		var title = media;

		//if ( subtitle.length > 0 )
		//	title += ' - Temporada ' + subtitle;
		if ( chapter.length > 0 )
			title += ' - ' + chapter;

		return title;
	}

	/**
	 * Devuelve el estado actual de la reproducción
	 */
	getState() {
		if ( $('blim-player-spinner').is(':visible') ) {
			return 'loading';
		}

		return super.getState();
	}

	/**
	 * Agregamos escuchas a eventos del reproductor
	 */
	binds() {
		// Nuestras propias acciones
		$('body').on('click', '.blim-player-controls-button--pause', this.onPaused);
		$('body').on('click', '.blim-player-controls-button--play', this.onPlay);
		$('.blim-player-scrub-bar').on('click', this.onSeek);
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		$('.blim-player-controls-button--pause').off('click');
		$('.blim-player-controls-button--play').off('click');
		$('.blim-player-scrub-bar').off('click');
	}

	/**
	 * Devuelve el objeto donde debemos inyectar el chat
	 */
	injectChatAfterThis() {
		// TODO: Resolver un bug que ocasiona que el reproductor detecte
		// los clics hechos sobre el 300px más a la derecha de lo que realmente estan
		return null;
		//return $('blim-player-html5');
	}
}