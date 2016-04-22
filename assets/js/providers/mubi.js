class Mubi extends BaseProvider
{
	/**
	 * Constructor
	 */
	constructor() {
		super();

		this.name		= 'Mubi';
		this.logo 		= 'mubi.png';
		this.baseUrl	= 'https://mubi.com';
		this.viewUrl	= this.baseUrl + '/films/';
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
	 * Devuelve el estado actual de la reproducción
	 */
	getState() {
		if ( $('.vjs-loading-spinner').is(':visible') ) {
			return 'loading';
		}

		return super.getState();
	}

	/**
	 * Agregamos escuchas a eventos del reproductor
	 */
	binds() {
		// Nuestras propias acciones
		$('body').on('click', '.vjs-play-control.vjs-playing', this.onPaused);
		$('body').on('click', '.vjs-play-control.vjs-paused', this.onPlay);
		$('.vjs-seek-handle').on('click', this.onSeek);
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		$('body').off('click', '.vjs-play-control.vjs-playing');
		$('body').off('click', '.vjs-play-control.vjs-paused');
		$('.vjs-seek-handle').off('click');
	}

	/**
	 * Devuelve el objeto donde debemos inyectar el chat
	 */
	injectChatAfterThis() {
		return $('#mubi-player');
	}
}