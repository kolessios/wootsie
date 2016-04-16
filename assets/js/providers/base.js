/**
 * Lista de proveedores disponibles
 */
var providers = {};

/**
 * Proveedor actual
 */
var provider = null;

/**
 * Tolerancia para el tiempo de reproducción
 */
var tolerance = 2;

/**
 * Clase base para representar un proveedor
 */
class BaseProvider
{
	/**
	 * Constructor
	 */
	constructor() {
		// Nombre del proveedor
		this.name = 'Invalid';

		// Logotipo
		this.logo = '';

		// Dirección base
		this.baseUrl = '';

		// Dirección donde miramos la transmisión
		this.viewUrl = '';

		// Información del Stream
		this.media = {
			id		: '',
			title	: '',
			duration: '',
			url		: document.location.href
		};
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
		return -1;
	}

	/**
	 * Devuelve el título del Stream
	 */
	getTitle() {
		return 'Invalid';
	}

	/**
	 * Devuelve la duración del Stream
	 */
	getDuration() {
		if ( this.video() == undefined ) return -1;
		return this.video().duration;
	}

	/**
	 * Devuelve el tiempo actual de la reproducción
	 */
	getCurrent() {
		if ( this.video() == undefined ) return -1;
		return this.video().currentTime;
	}

	/**
	 * Devuelve el estado actual de la reproducción
	 */
	getState() {
		if ( this.video().readyState < 4 ) {
			return 'loading';
		}

		if ( this.video().paused ) {
			return 'paused';
		}

		return 'playing';
	}

	/**
	 * [Evento] Estamos listos para leer información
	 */
	ready() {
		this.media.id			= this.getId()
		this.media.title		= this.getTitle();
		this.media.duration		= this.getDuration();
	}

	/**
	 * Agregamos escuchas a eventos del reproductor
	 */
	binds() {
		this.video().onpaused		= this.onPaused;
		this.video().onplay			= this.onPlay;
		this.video().onplaying		= this.onPlaying;
		this.video().ontimeupdate	= this.onTimeUpdate;
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		this.video().onpaused		= null;
		this.video().onplay			= null;
		this.video().onplaying		= null;
		this.video().ontimeupdate	= null;
	}

	/**
	 * [Evento] Nos hemos conectado a una sesión
	 */
	onConnected() { 
		this.binds();
	}

	/**
	 * [Evento] Nos hemos desconectado de la sesión
	 */
	onDisconnected() {
		this.clear();
	}

	/**
	 * [Evento] El Stream ha sido pausado (yo o alguién más)
	 */
	onPaused( e ) {
		if ( typeof e.offsetX != 'undefined' ) return provider.onOwnPaused();
	}

	/**
	 * [Evento] He pausado el Stream
	 */
	onOwnPaused() {
		Streaming.touch();
		Chat.state( Streaming.clientName, 'paused' );
	}

	/**
	 * [Evento] El Stream ha sido reanudado (yo o alguién más)
	 * @return {[type]} [description]
	 */
	onPlay( e ) {
		if ( typeof e.offsetX != 'undefined' ) return provider.onOwnPlay();
	}

	/**
	 * [Evento] He reanudado/reproducido el Stream
	 * @return {[type]} [description]
	 */
	onOwnPlay( e ) {
		Streaming.touch();
		Chat.state( Streaming.clientName, 'playing' );
	}

	/**
	 * [Evento] Hemos cambiado la parte del Stream
	 */
	onSeek( e ) {
		// Esperamos 800ms
		delay(800)().then(function() {
			// Esperamos hasta que el estado sea "Cargando..." o siga reproduciendose
			delayUntil(function() {
				return ( provider.getState() == 'loading' || provider.getState() == 'playing' );
			}, 1000)()

			// Actualizamos en el servidor
			.then(function() {
				Streaming.touch();
				Chat.seek( Streaming.clientName, provider.getCurrent() );
			});
		});		
	}

	/**
	 * [Evento] El Stream ha reanudado después de cargar
	 */
	onPlaying() {
		
	}

	/**
	 * [Evento] La reproducción esta avanzando...
	 */
	onTimeUpdate() {
		
	}

	/**
	 * Pausa la reproducción del Stream
	 */
	pause() {
		this.video().pause();

		return delayUntil(function() {
			return ( provider.getState() === 'paused' );
		}, 1000)().then( provider.hideControls );
	}

	/**
	 * Reanuda la reproducción del Stream
	 */
	play() {
		this.video().play();

		return delayUntil(function() {
			return ( provider.getState() === 'playing' );
		}, 2500)().then( provider.hideControls );
	}

	/**
	 * Reanuda la reproducción en un punto especifico
	 */
	seek( ms ) {
		this.video().currentTime = ms;

		return delayUntil(function() {
			return ( Math.floor(ms) - Math.floor(provider.getCurrent()) <= tolerance );
		}, 10000)();
	}

	/**
	 * Establece el estado de reproducción
	 */
	setState( state ) {
		if ( state == 'paused' ) {
			return provider.pause();
		}

		if ( state == 'playing' ) {
			return provider.play();
		}

		return delay(1)();
	}

	/**
	 * Muestra los controles de reproducción
	 */
	showControls() {
		return delay(1)();
	}

	/**
	 * Oculta los controles de reproducción
	 */
	hideControls() {
		return delay(1)();
	}

	/**
	 * Devuelve el objeto donde debemos inyectar el chat
	 */
	injectChatAfterThis() {
		return null;
	}

	/**
	 * Establece el logo del proveedor en el popup
	 */
	setLogo() {
		var logo = document.getElementById('provider-logo');
		logo.setAttribute('src', 'assets/images/providers/' + this.logo);
	}

	/**
	 * Devuelve la lista de parámetros para la dirección para compartir
	 */
	getFixedQuery( sessionId ) {
		return $.query.set('wootsie', sessionId);
	}

	/**
	 * Devuelve la dirección especial para compartir.
	 * La dirección de reproducción con la ID de la sesión
	 */
	getSessionUrl( sessionId ) {
		var split = document.location.href.split('?');
		return split[0] + this.getFixedQuery( sessionId ).toString();
	}

	/**
	 * Devuelve si la dirección es propiedad del proveedor
	 */
	isValid( url = null ) {
		if ( url.indexOf(this.baseUrl) > -1 )
			return true;

		return false;
	}

	/**
	 * Devuelve si la dirección es la página de visualización
	 */
	isWatching( url = null ) {
		if ( url.indexOf(this.viewUrl) > -1 )
			return true;

		return false;
	}
}

/**
 * Devuelve el proveedor para la dirección web
 */
function getProvider( url ) {
	console.log(url);
	// Buscamos entre todos los proveedores
	for( let i in providers ) {
		let provider = providers[i];

		// Proveedor actual
		if ( provider.isValid(url) || provider.isWatching(url) ) {
			return provider;
		}
	}

	return null;
}

/**
 * Agrega todos los proveedores disponibles
 */
function addProviders() {
	providers['netflix']	= new Netflix();
	providers['clarovideo']	= new ClaroVideo();
	providers['blim']		= new Blim();
	providers['youtube']	= new YouTube();
	providers['vimeo']		= new Vimeo(); // TODO: Pruebas
}

/**
 * [htmlEntities description]
 * https://css-tricks.com/snippets/javascript/htmlentities-for-javascript/
 */
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * https://github.com/boyers/netflixparty-chrome/blob/master/content_script.js#L44
 */
var delay = function(milliseconds) {
  return function(result) {
	return new Promise(function(resolve, reject) {
	  setTimeout(function() {
		resolve(result);
	  }, milliseconds);
	});
  };
};

/**
 * https://github.com/boyers/netflixparty-chrome/blob/master/content_script.js#L56
 */
var delayUntil = function(condition, maxDelay) {
  return function(result) {
    var delayStep = 250;
    var startTime = (new Date()).getTime();
    var checkForCondition = function() {
      if (condition()) {
        return Promise.resolve(result);
      }
      if (maxDelay !== null && (new Date()).getTime() - startTime > maxDelay) {
      	console.error('delayUntil timed out');
      	 return Promise.resolve(result);
        //return Promise.reject(Error('delayUntil timed out'));
      }
      return delay(delayStep)().then(checkForCondition);
    };
    return checkForCondition();
  };
};