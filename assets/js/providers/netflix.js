var scrubber;
var options;

class Netflix extends BaseProvider
{
	/**
	 * Constructor
	 */
	constructor() {
		super();

		this.name		= 'Netflix';
		this.logo 		= 'netflix.png';
		this.baseUrl	= 'https://www.netflix.com';
		this.viewUrl	= this.baseUrl + '/watch/';
	}

	/**
	 * Instancia al <video> del Stream
	 */
	video() {
		return $('.player-video-wrapper video').get(0);
	}

	/**
	 * Devuelve la ID del Stream
	 */
	getId() {
		var s1 = document.location.href.split('/');
		var s2 = s1[4].split('?');

		return s2[0];
	}

	/**
	 * Devuelve el título del Stream
	 */
	getTitle() {
		// Contenedor con la información
		var container = $('.playback-longpause-container .content');

		if ( container.length == 0 ) return null;

		// Titulos
		var media		= container.find('h2').text();
		var subtitle	= container.find('h3').first().text();
		var chapter		= container.find('h3').last().text();

		if ( media.length == 0 ) return null;

		var title = media;

		if ( subtitle.length > 0 )
			title += ' - ' + subtitle;
		if ( chapter.length > 0 )
			title += ' - ' + chapter;

		return title;
	}

	/**
	 * Devuelve el estado actual de la reproducción
	 */
	getState() {
		if ( $('.player-progress-round').css('display') != 'none' ) {
			return 'loading';
		}

		return super.getState();
	}

	/**
	 * Agregamos escuchas a eventos del reproductor
	 */
	binds() {
		// Nuestras propias acciones
		$('body').on('click', '.player-play-pause.pause', this.onPaused);
		$('body').on('click', '.player-play-pause.play', this.onPlay);
		$('#scrubber-component').on('click', this.onSeek);
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		$('body').off('click', '.player-play-pause.pause');
		('body').off('click', '.player-play-pause.play');
		$('#scrubber-component').off('click');
	}

	/**
	 * Pausa la reproducción del Stream
	 */
	pause() {
		provider.showControls().then(function() {
			$('.player-play-pause.pause').click();
		});

		return delayUntil(function() {
			return ( provider.getState() === 'paused' );
		}, 1000)().then( provider.hideControls );
	}

	/**
	 * Reanuda la reproducción del Stream
	 */
	play() {
		provider.showControls().then(function() {
			$('.player-play-pause.play').click();
		});

		return delayUntil(function() {
			return ( provider.getState() === 'playing' );
		}, 2500)().then( provider.hideControls );
	}

	/**
	 * Reanuda la reproducción en un punto especifico
	 * https://github.com/boyers/netflixparty-chrome/blob/master/content_script.js#L241
	 */
	seek( ms ) {
		// Mostramos los controles primero
		return provider.showControls()

		// Calculamos la posición del mouse sobre la barra de progreso 
		// y simulamos el hover sobre el
		.then(function() {
			// Agregamos dos segundos, por si tiene que cargar...
			// TODO: Una solución mejor...
			ms = ms + 2;

			scrubber		= $('#scrubber-component');
			let factor		= ms / provider.getDuration();
			factor			= Math.min( Math.max(factor, 0), 1 );
			
			let mouseX = scrubber.offset().left + Math.round(scrubber.width() * factor);
			let mouseY = scrubber.offset().top + scrubber.height() / 2;

			options = {
				'bubbles'		: true,
				'button'		: 0,
				'screenX'		: mouseX - $(window).scrollLeft(),
				'screenY'		: mouseY - $(window).scrollTop(),
				'clientX'		: mouseX - $(window).scrollLeft(),
				'clientY'		: mouseY - $(window).scrollTop(),
				'offsetX'		: mouseX - scrubber.offset().left,
				'offsetY'		: mouseY - scrubber.offset().top,
				'pageX'			: mouseX,
				'pageY'			: mouseY,
				'currentTarget'	: scrubber[0]
			}

			scrubber[0].dispatchEvent(new MouseEvent('mouseover', options));
		})

		// Esperamos a que la barra sea visible
		.then(delayUntil(function() {
			return $('.trickplay-preview').is(':visible');
		}, 2500))

		// Simulamos el click en la barra de progreso
		.then(function() {
			scrubber[0].dispatchEvent(new MouseEvent('mousedown', options));
			scrubber[0].dispatchEvent(new MouseEvent('mouseup', options));
			scrubber[0].dispatchEvent(new MouseEvent('mouseout', options));
		})

		// Esperamos hasta que el Stream se sincronize
		.then(delayUntil(function() {
			return ( Math.floor(ms) - Math.floor(provider.getCurrent()) <= 1 );
		}, 10000))

		// Ocultamos los controles
		.then( provider.hideControls );
	}

	/**
	 * Muestra los controles de reproducción
	 * https://github.com/boyers/netflixparty-chrome/blob/master/content_script.js#L162
	 */
	showControls() {
		scrubber = $('#scrubber-component');
		let options = {
			'bubbles'		: true,
			'button'		: 0,
			'currentTarget'	: scrubber[0]
		};

		scrubber[0].dispatchEvent(new MouseEvent('mousemove', options));

		return delayUntil(function() {
			return scrubber.is(':visible');
		}, 1000)();
	}

	/**
	 * Oculta los controles de reproducción
	 * https://github.com/boyers/netflixparty-chrome/blob/master/content_script.js#L179
	 */
	hideControls() {
		let player = $('#netflix-player');
		let mouseX = 100;
		let mouseY = 100;

		let options = {
			'bubbles'		: true,
			'button'		: 0,
			'screenX'		: mouseX - $(window).scrollLeft(),
			'screenY'		: mouseY - $(window).scrollTop(),
			'clientX'		: mouseX - $(window).scrollLeft(),
			'clientY'		: mouseY - $(window).scrollTop(),
			'offsetX'		: mouseX - player.offset().left,
			'offsetY'		: mouseY - player.offset().top,
			'pageX'			: mouseX,
			'pageY'			: mouseY,
			'currentTarget'	: player[0]
		};

		player[0].dispatchEvent( new MouseEvent('mousemove', options) );

		return delay(1)();
	}

	/**
	 * Devuelve el objeto donde debemos inyectar el chat
	 */
	injectChatAfterThis() {
		return $('#netflix-player');
	}

	/**
	 * Devuelve la lista de parámetros para la dirección para compartir
	 */
	getFixedQuery( sessionId ) {
		var query = $.query.load( document.location.href );
		return query.remove('trackId').remove('tctx').set('wootsie', sessionId);
	}
}