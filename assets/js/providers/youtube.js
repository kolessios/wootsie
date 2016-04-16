class YouTube extends BaseProvider
{
	/**
	 * Constructor
	 */
	constructor() {
		super();

		this.name		= 'YouTube';
		this.logo 		= 'youtube.png';
		this.baseUrl	= 'https://www.youtube.com';
		this.viewUrl	= this.baseUrl + '/watch';
	}

	/**
	 * Devuelve la ID del Stream
	 */
	getId() {
		return $.query.get('v');
	}

	/**
	 * Devuelve el título del Stream
	 */
	getTitle() {
		return $('.watch-title').text().trim();
	}

	/**
	 * Agregamos escuchas a eventos del reproductor
	 */
	binds() {
		// Nuestras propias acciones
		// Iván: Por ahora esto funciona bien, pero no es lo mejor...
		$('body').on('click', '.ytp-play-button', this.onPaused);
		$('body').on('click', '.ytp-play-button', this.onPlay);

		$('.ytp-progress-bar-container').on('click', this.onSeek);
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		$('.ytp-play-button').off('click');
		$('.ytp-progress-bar-container').off('click');
	}
}