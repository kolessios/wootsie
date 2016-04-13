/**
 * Conexión con el servidor
 */
var server = new Firebase('https://wootsie.firebaseio.com/');

/**
 * Referencia a la sesión actual
 */
var session = null;

/**
 * Información de la sesión
 */
var sessionData = null;

/**
 * Referencia al cliente actual
 */
var client = null;

/**
 * Información del líder de la sesión (el más actualizado)
 */
var leader = null;
	
/**
 * Interval de actualización
 */
var updateInterval = null;

/**
 * Tolerancia para el tiempo de reproducción
 */
var tolerance = 2;

/**
 * Controla la sincronización, las acciones con el Stream y la comunicación entre el proveedor y el Popup (Wootsie)
 */
class Streaming
{
	/**
	 * Inicialización
	 */
	static init() {
		// Registramos los proveedores soportados
		addProviders();

		// Nombre del usuario
		this.clientName = '';

		// ¿Control total?
		this.control	= false;
		this.owner		= false;

		// Tiempo de sincronización
		this.sync = -1;

		// Preparamos...
		this.prepare();
	}

	/**
	 * Hemos realizado alguna acción
	 */
	static touch() {
		// Hay un "controlador" y no somos nosotros...
		// Debemos sincronizarnos con el "controlador"
		if ( sessionData.control > -1 && this.control == false ) {
			this.sync = -1;
			return;
		}

		this.sync = Date.now();
		console.log('[Wootsie] Touch!');
	}

	/**
	 * Prepara todo con la información de la página actual
	 */
	static prepare() {
		// Obtenemos el proveedor de la página
		provider = getProvider( document.location.href );

		// ¡No es un proveedor válido!
		if ( provider == null ) {
			console.error('> Se ha permitido abrir el Popup sin una pestaña válida!');
			return;
		}

		// Binds!
		this.binds();
	}

	/**
	 * [binds description]
	 */
	static binds() {
		// Escuchamos por mensajes de Wootsie
		chrome.runtime.onMessage.addListener( this.onChromeMessage );
	}

	/**
	 * Desconecta la sesión actual
	 */
	static disconnect() {
		if ( session == null ) return;

		// Dejamos de actualizar
		clearInterval( updateInterval );

		// Avisamos al proveedor
		provider.onDisconnected();

		// Nos desconectamos
		if ( client != null )
			client.remove();

		// Reiniciamos variables
		session	= null;
		client	= null;
		leader	= null;

		sessionData = null;

		// ¿Control total?
		Streaming.control	= false;
		Streaming.owner		= false;

		// Tiempo de sincronización
		Streaming.sync = -1;

		console.log('[Wootsie] Desconexión éxitosa.');
	}

	/**
	 * Crea una nueva sesión
	 */
	static create( name, control = false ) {
		// Aún no ha cargado por completo
		if ( provider.getId() == undefined ) {
			console.warn('[Wootsie] Reintentando...');
			delay(500)().then(function() { Streaming.create( name, control ); });

			return;
		}

		// Dejamos que el proveedor recolecte información
		// de la propia página
		provider.ready();

		// Ya estamos conectados
		if ( session != null ) {
			Streaming.disconnect();
		}

		// Información inicial de la sesión
		var data = {
			'owner'		: -1,
			'control'	: -1,
			'created'	: Date.now(),
			
			'media'		: provider.media,			
			'viewers'	: { }
		};

		// Creamos la sesión en el servidor
		session = server.push( data );
		console.log('[Wootsie] Sesión ' + session.key() + ' creada');

		// Control total?
		this.control	= control;
		this.owner		= true;

		// Nos únimos
		this.join( name, session.key() );
	}

	/**
	 * Nos únimos a una sesión y establecemos la ID del cliente
	 */
	static join( name, sessionId ) {
		// Aún no ha cargado por completo
		if ( provider.getId() == undefined ) {
			console.warn('[Wootsie] Reintentando...');
			delay(500)().then(function() { Streaming.join( name, sessionId ); });

			return;
		}

		// Nombre del Cliente
		this.clientName = name;

		// Conexión con la sesión
		session = server.child( sessionId );

		// Obtenemos la información de la sesión
		session.on('value', function( snapshot ) {
			session.off('value');
			let val = snapshot.val();

			// La sesión no existe
			if ( val == null ) {
				// Respondemos a Wootsie con la información de la sesión
				Streaming.sendMessage({
					'command': 'invalid-session'
				});

				delay(500)().then( Streaming.disconnect );
				console.error('[Wootsie] La sesión ' + sessionId + ' no existe');

				return;
			}

			// Información
			sessionData = val;

			let data = {
				name	: Streaming.clientName,
				sync	: Streaming.sync,
				current	: provider.getCurrent(),
				state	: provider.getState()
			};

			// Agregamos al cliente
			client = session.child('viewers').push( data );

			// Preparamos lo que ocurrira si nos desconectamos
			client.onDisconnect().remove();

			// Estamos listos
			Streaming.onConnected();
		});
	}

	/**
	 * Actualiza la información del cliente al servidor
	 */
	static update() {
		let data = {
			name	: Streaming.clientName,
			sync	: Streaming.sync,
			current	: provider.getCurrent(),
			state	: provider.getState()
		};

		client.set( data );
	}

	/**
	 * [Evento] Conexión establecida
	 */
	static onConnected() {
		// Dueño de la sesión
		if ( this.owner ) {
			session.update({ owner: client.key() });
			Streaming.touch();
		}

		// Tenemos el control absoluto
		if ( this.control )
			session.update({ control: client.key() });

		// Obtenemos la información de la sesión
		session.on('value', function( snapshot ) {
			session.off('value');
			let val = snapshot.val();

			// Actualizamos la información
			sessionData = val;
		});

		// Avisamos al proveedor
		provider.onConnected();

		// Binds
		session.child('viewers').on('child_added', Streaming.onClientConnect);
		session.child('viewers').on('child_removed', Streaming.onClientDisconnect);

		// Nadie tiene control total, escuchamos por cualquier cambio
		if ( sessionData.control == -1 ) {
			session.child('viewers').on('value', Streaming.onUpdate);
		}

		// Solo escuchamos por los cambios del "controlador"
		else {
			session.child('viewers').child( sessionData.control ).on('value', Streaming.onUpdate);
		}

		// Empezamos a mandar actualizaciones del cliente
		updateInterval = setInterval( this.update, 300 );

		// Dirección para acceder a la sesión
		var url = provider.getSessionUrl( session.key() );

		// Reemplazamos la dirección actual con la dirección especial
		window.history.replaceState( null, document.title, url );

		// Respondemos a Wootsie con la información de la sesión
		this.sendMessage({
			'command'	: 'connected',
			'sessionId'	: session.key(), 
			'url'		: url
		});

		console.log('[Wootsie] ' + this.clientName + ' (' + client.key() + ') se ha únido a la sesión ' + session.key());
	}

	/**
	 * [Evento] Se ha únido un nuevo cliente a la transmisión
	 */
	static onClientConnect( snapshot ) {

	}

	/**
	 * [Evento] Se ha únido un nuevo cliente a la transmisión
	 */
	static onClientDisconnect( snapshot ) {

	}

	/**
	 * [Evento] Se ha actualizado la información de algún cliente
	 */
	static onUpdate( snapshot ) {
		var val = snapshot.val();

		// Información de nuestro streaming
		var current = Math.floor( provider.getCurrent() );
		var state 	= provider.getState();

		// Líder actual
		var lead = null;

		// No hay nadie con control total, revisamos la lista...
		if ( sessionData.control == -1 ) {
			var lastSync = -1;

			for( let id in val ) {
				// No nos interesa nuestras propias actualizaciones
				if ( id == client.key() ) continue; 

				let user = val[id];

				// Este usuario ha hecho algo después de 
				// nuestra última sincronización
				if ( user.sync > (Streaming.sync+1) ) {
					if ( user.sync > lastSync ) {
						lead = user;
						lastSync = user.sync;
					}
				}
			}
		}

		// "Controlador" = Líder
		else {
			lead = val;

			// ¡El controlador se ha desconectado!
			if ( lead == null ) {
				Streaming.disconnect();
				return;
			}

			// No nos interesa nuestras propias actualizaciones
			if ( snapshot.key() == client.key() ) return;

			// Ya estamos sincronizados...
			if ( lead.sync == (Streaming.sync+1) ) return;
		}

		// ¡Todos estamos sincronizados! :)
		if ( lead == null ) return;

		// Nuestro líder actual
		leader = lead;

		// El líder esta cargando otra parte
		// del Stream, esperamos...
		if ( leader.state === 'loading' ) {
			provider.pause();

			console.log('[Wootsie]['+leader.sync+'] Esperando al líder... ' + leader.state);
			return;
		}

		let leaderCurrent = Math.floor(leader.current);

		// Debemos sincronizar el tiempo
		if ( leaderCurrent > (current+tolerance) || leaderCurrent < (current-tolerance) ) {
			// Sincronizamos el tiempo y después el estado
			provider.seek( leader.current ).then(function() {
				provider.setState( leader.state );
				console.warn('[Wootsie]['+leader.sync+'] Estado: ' + state + ' -> ' + leader.state);
			});

			console.warn('[Wootsie]['+leader.sync+'] Sincronizando Tiempo: ' + current + ' -> ' + leaderCurrent);
		}

		// Sincronizamos el estado
		else if ( state != leader.state ) {
			provider.setState( leader.state );
			console.warn('[Wootsie]['+leader.sync+'] Sincronizando Estado: ' + state + ' -> ' + leader.state);
		}

		// Sincronizamos: Disminuimos 1 para que el líder original sincronize
		// a los que recien entran.
		Streaming.sync = ( leader.sync - 1 );

		console.log('[Wootsie] Líder: ' + leader.name + ' - Sincronización: ' + leader.sync);
		console.log('');
	}

	/**
	 * [Evento] Hemos recibido un mensaje de Wootsie
	 */
	static onChromeMessage( message, sender, response ) {
		//console.log(message);

		// Creamos la sesión
		if ( message.command === 'create-session' ) {
			Streaming.create( message.name, message.control );
		}

		// Unirnos a la sesión
		else if ( message.command === 'join-session' ) {
			Streaming.join( message.name, message.sessionid );
		}

		// Wootsie nos solicita nuestro estado actual
		else if ( message.command === 'status' ) {
			if ( session == null ) {
				var data = {
					status: 'disconnected',
				};
			}
			else {
				var data = {
					status		: 'connected',
					sessionId	: session.key(), 
					url			: provider.getSessionUrl( session.key() )
				}
			}

			// Respondemos
			response( data );
		}

		// Queremos desconectarnos
		else if ( message.command === 'disconnect' ) {
			Streaming.disconnect();

			// Response
			response();
		}
	}

	/**
	 * Envía un mensaje a Wootsie
	 */
	static sendMessage( message, response = null ) {
		chrome.runtime.sendMessage( message, response );
	}
}

// Comenzamos
Streaming.init();