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
		// Clic en reproducir/pausar
		$('body').on('click', '.ytp-play-button', function(e) {
			if ( provider.getState() == 'playing' ) {
				provider.onPaused(e);
			}
			else {
				provider.onPlay(e);
			}
		});

		// Clic en el vídeo
		$('body').on('click', 'video', function(e) {
			if ( provider.getState() == 'playing' ) {
				provider.onPaused(e);
			}
			else {
				provider.onPlay(e);
			}
		});

		$('.ytp-progress-bar-container').on('click', this.onSeek);
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		$('body').off('click', '.ytp-play-button');
		$('.ytp-progress-bar-container').off('click');
	}
}