/**
 * Lista de proveedores disponibles
 */
var providers = {};

/**
 * Proveedor actual
 */
var provider = null;

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

		// Media
		this.media = {
			id: '',
			title: '',
			duration: '',
			url: document.location.href
		};
	}

	/**
	 * Instancia al <video> del Stream
	 */
	instance() {
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
		return 'BaseProvider - Title - Chapter 1';
	}

	/**
	 * Devuelve la duración del Stream
	 */
	getDuration() {
		if ( this.instance() == undefined ) return -1;
		return this.instance().duration;
	}

	/**
	 * Devuelve el tiempo actual de la reproducción
	 */
	getCurrent() {
		if ( this.instance() == undefined ) return -1;
		return this.instance().currentTime;
	}

	/**
	 * Devuelve el estado actual de la reproducción
	 */
	getState() {
		if ( this.instance().readyState < 4 ) {
			return 'loading';
		}

		if ( this.instance().paused ) {
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
		this.instance().onpaused		= this.onPaused;
		this.instance().onplay			= this.onPlay;
		this.instance().onplaying		= this.onPlaying;
		this.instance().ontimeupdate	= this.onTimeUpdate;
	}

	/**
	 * Limpiamos los escuchas
	 */
	clear() {
		this.instance().onpaused		= null;
		this.instance().onplay			= null;
		this.instance().onplaying		= null;
		this.instance().ontimeupdate	= null;
	}

	/**
	 * [Evento] Nos hemos conectado
	 */
	onConnected() { 
		this.binds();
	}

	/**
	 * [Evento] Nos hemos desconectado
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
	}

	/**
	 * [Evento] Hemos cambiado la parte del Stream
	 */
	onSeek( e ) {
		Streaming.touch();
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
		this.instance().pause();

		return delayUntil(function() {
			return ( provider.getState() === 'paused' );
		}, 1000)().then( provider.hideControls );
	}

	/**
	 * Reanuda la reproducción del Stream
	 */
	play() {
		this.instance().play();

		return delayUntil(function() {
			return ( provider.getState() === 'playing' );
		}, 2500)().then( provider.hideControls );
	}

	/**
	 * Reanuda la reproducción en un punto especifico
	 */
	seek( ms ) {
		return delay(1)();
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
	 * Establece el logo del proveedor en el popup
	 */
	setLogo() {
		var logo = document.getElementById('provider-logo');
		logo.setAttribute('src', 'assets/images/providers/' + this.logo);
	}

	/**
	 * Devuelve la dirección especial para compartir.
	 * La dirección de reproducción con la ID de la sesión
	 */
	getSessionUrl( sessionId ) {
		var url = ( typeof Popup == 'function' ) ? Popup.tab.url : document.location.href;

		var query 		= $.query.load( url );
		var newQuery 	= query.remove('trackId').remove('tctx').set('wootsie', sessionId).toString();

		var split = url.split('?');
		return split[0] + newQuery;
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
	// Buscamos entre todos los proveedores
	for( let i in providers ) {
		let provider = providers[i];

		// Proveedor actual
		if ( provider.isWatching(url) ) {
			return provider;
		}
	}

	return null;
}

/**
 * Agrega todos los proveedores disponibles
 */
function addProviders() {
	providers['netflix'] = new Netflix();
}