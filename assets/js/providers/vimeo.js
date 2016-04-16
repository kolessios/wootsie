class Vimeo extends BaseProvider
{
	/**
	 * Constructor
	 */
	constructor() {
		super();

		this.name		= 'Vimeo';
		this.logo 		= 'vimeo.png';
		this.baseUrl	= 'https://vimeo.com';
		this.viewUrl	= this.baseUrl + '/';
	}

	/**
	 * Objeto del <video>
	 */
	video() {
		return $('video').get(0);
	}

	/**
	 * Devuelve la ID del Stream
	 */
	getId() {
		return 'TODO';
	}

	/**
	 * Devuelve el título del Stream
	 */
	getTitle() {
		return $('.clip_info-header span').text();
	}

	/**
	 * Agregamos escuchas a eventos del reproductor
	 */
	binds() {
		// Nuestras propias acciones
		$('body').on('click', '.play.state-playing', this.onPaused);
		$('body').on('click', '.play.state-paused', this.onPlay);

		$('.controls .progress').on('click', this.onSeek);
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		$('body').off('click', '.play.state-playing');
		$('body').off('click', '.play.state-paused');
		$('.controls .progress').off('click');
	}
}