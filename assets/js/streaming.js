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
var sessionInfo = null;

/**
 * Referencia al cliente actual
 */
var client = null;

/**
 * Información del líder de la sesión (el más actualizado)
 */
var leader = null;

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

		// Nombre del cliente
		this.clientName = '';

		// ¿Autoridad?
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
		// Hay un "autoridad" y no somos nosotros...
		// Debemos sincronizarnos con el "autoridad"
		if ( sessionInfo != null && sessionInfo.control != null && this.control == false ) {
			this.sync = -1;
			return;
		}

		this.sync = Date.now();
		this.update();

		console.log('%c[Wootsie] Touch: %s', 'color:#1730ed', this.sync);
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

		session.child('viewers').off('child_added');
		session.child('viewers').off('child_removed');
		session.off('value');

		// Dejamos de actualizar
		clearInterval( Streaming.updateInterval );

		// Avisamos al proveedor
		provider.onDisconnected();

		// Avisamos al chat
		Chat.clear();

		// Nos desconectamos
		if ( client != null )
			client.remove();

		// Reiniciamos variables
		session		= null;
		client		= null;
		leader		= null;
		sessionInfo	= null;

		Streaming.control	= false;
		Streaming.owner		= false;
		Streaming.sync		= -1;

		console.log('%cDesconexión éxitosa.', 'color:orange');
	}

	/**
	 * Crea una nueva sesión
	 */
	static create( name, control = false ) {
		// Aún no ha cargado por completo
		if ( provider.getId() == undefined ) {
			console.count('Reintentando...');
			delay(500)().then(function() { Streaming.create( name, control ); });
			return;
		}

		// Dejamos que el proveedor recolecte información
		// de la propia página
		provider.ready();

		// Ya tenemos una sesión
		// nos desconectamos...
		if ( session != null ) {
			Streaming.disconnect();
		}

		// Información inicial de la sesión
		var data = {
			'owner'		: -1,
			'control'	: -1,
			'created'	: Date.now(),
			'provider'	: provider.name,
			
			'media'		: provider.media,		
			'viewers'	: {},
			'chat' 		: {}
		};

		// Creamos la sesión en el servidor
		session = server.push( data );
		console.log('%cSesión %s creada', 'color:green', session.key());

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
			console.count('Reintentando...');
			delay(500)().then(function() { Streaming.join( name, sessionId ); });
			return;
		}

		// Dejamos que el proveedor recolecte información
		// de la propia página
		provider.ready();

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
				// Respondemos a Wootsie
				Streaming.sendMessage({ 'command': 'invalid-session' });
				delay(500)().then( Streaming.disconnect );

				console.error('La sesión %s no existe', sessionId);
				return;
			}

			// Esta sesión no es para esta transmisión
			if ( val.media.id != provider.media.id || val.provider != provider.name ) {
				// Respondemos a Wootsie
				Streaming.sendMessage({ 'command': 'invalid-streaming' });
				delay(500)().then( Streaming.disconnect );

				console.error('La sesión %s no es válida para esta transmisión', sessionId);
				return;
			}

			// Información
			sessionInfo = (JSON.parse(JSON.stringify(val)));

			// Autoridad total
			if ( typeof val.viewers != 'undefined' && typeof val.viewers[val.control] != 'undefined' ) {
				sessionInfo.control		= val.viewers[val.control];
				sessionInfo.control.id	= val.control;
			}
			else {
				sessionInfo.control = null;
			}

			// Anfitrión
			if ( typeof val.viewers != 'undefined' &&  typeof val.viewers[val.owner] != 'undefined' ) {
				sessionInfo.owner		= val.viewers[val.owner];
				sessionInfo.owner.id	= val.owner;
			}
			else {
				sessionInfo.owner = null;
			}

			let data = {
				name	: Streaming.clientName,
				sync	: Streaming.sync,
				current	: provider.getCurrent(),
				state	: provider.getState()
			};

			// Agregamos al cliente
			client = session.child('viewers').push( data );
			console.log('%cNos hemos únido a la sesión %s (%s)\n', 'color:green', session.key(), client.key());

			// Eliminamos nuestra información al desconectarnos
			client.onDisconnect().remove();

			// Estamos listos
			// Iván: Esperamos 300ms para que los .on no se vuelvan locos
			delay(300)().then(function() { Streaming.onConnected(); });
		});
	}

	/**
	 * Actualiza la información del cliente
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

		// Avisamos al proveedor
		provider.onConnected();

		// Empezamos a mandar nuestras actualizacaiones
		Streaming.update();
		Streaming.updateInterval = setInterval( Streaming.update, 300 );

		// Binds
		session.child('viewers').on('child_added', Streaming.onClientConnect);
		session.child('viewers').on('child_removed', Streaming.onClientDisconnect);
		session.on('value', Streaming.onUpdate);

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

		// Iniciamos el chat
		Chat.init();

		console.timeEnd('Preparado');
		console.groupEnd();
	}

	/**
	 * [Evento] Se ha únido un nuevo cliente a la transmisión
	 */
	static onClientConnect( snapshot ) {
		var val = snapshot.val();

		Chat.addMessage({
			system: true,
			message: '<strong>'+val.name+'</strong> se ha únido.'
		});	

		console.log('%c[Wootsie] %s se ha únido a la sesión.', 'color:#11c497', val.name);
	}

	/**
	 * [Evento] Se ha únido un nuevo cliente a la transmisión
	 */
	static onClientDisconnect( snapshot ) {
		var val = snapshot.val();

		Chat.addMessage({
			system: true,
			message: '<strong>'+val.name+'</strong> se ha ido :('
		});	

		console.log('%c[Wootsie] %s se ha desconectado de la sesión.', 'color:darkred', val.name);
	}

	/**
	 * [Evento] Se ha actualizado la información de la sesión
	 */
	static onUpdate( snapshot ) {
		var val = snapshot.val();

		// Información de nuestro streaming
		var current = Math.floor( provider.getCurrent() );
		var state 	= provider.getState();

		// Actualizamos la información de la sesión
		sessionInfo = (JSON.parse(JSON.stringify(val)));

		// Autoridad total
		if ( typeof val.viewers[val.control] != 'undefined' ) {
			sessionInfo.control		= val.viewers[val.control];
			sessionInfo.control.id	= val.control;
		}
		else {
			sessionInfo.control = null;
		}

		// Anfitrión
		if ( typeof val.viewers[val.owner] != 'undefined' ) {
			sessionInfo.owner		= val.viewers[val.owner];
			sessionInfo.owner.id	= val.owner;
		}
		else {
			sessionInfo.owner = null;
		}

		// Líder de reproducción
		var lead		= null;
		var lastSync	= -2;

		// No hay una "autoridad"
		if ( val.control == -1 ) {
			// Buscamos el más actualizado, un líder
			for( let id in val.viewers ) 
			{
				let user = val.viewers[id];

				if ( user.sync > lastSync ) {
					lead		= user;
					lead.id		= id;
					lastSync	= user.sync;
				}
			}
		}
		else {
			lead = sessionInfo.control;

			// ¡La autoridad se ha desconectado!
			if ( lead == null ) {
				//Streaming.disconnect();
				return;
			}
		}

		// Nuestro líder actual
		leader = lead;

		// Actualizamos la información del chat
		Chat.update();

		// Ya estamos sincronizados
		if ( leader.sync == (Streaming.sync+1) ) return;

		// Somos el líder
		if ( Streaming.imLeader() ) return;

		// El líder esta cargando otra parte
		// del Stream, esperamos...
		if ( leader.state === 'loading' ) {
			//provider.pause();

			console.log('[Wootsie][%s] Esperando al líder %s...', leader.sync, leader.state);
			return;
		}

		console.group('[Wootsie] Sincronización %s', leader.sync);

		let leaderCurrent = Math.floor(leader.current);

		// Debemos sincronizar el tiempo
		if ( leaderCurrent > (current+tolerance) || leaderCurrent < (current-tolerance) ) {
			// Sincronizamos el tiempo y después el estado
			provider.seek( leader.current ).then(function() {
				provider.setState( leader.state );
				console.warn('Estado: %s -> %s', state, leader.state);
			});

			console.warn('Tiempo: %s -> %s', current, leaderCurrent);

			// Notificamos en el chat
			Chat.seek( leader.name, leaderCurrent );
		}

		// Sincronizamos el estado
		else if ( state != leader.state ) {
			if ( !Streaming.imLeader() ) {
				provider.setState( leader.state );
				console.warn('Estado: %s -> %s', state, leader.state);
			}

			// Notificamos en el chat
			Chat.state( leader.name, leader.state );
		}

		// Sincronizamos: Disminuimos 1 para que el líder original sincronize
		// a los que recien entran.
		Streaming.sync = ( leader.sync - 1 );

		console.log('Líder: %s', leader.name);
		console.groupEnd();
	}

	/**
	 * [Evento] Hemos recibido un mensaje de Wootsie
	 */
	static onChromeMessage( message, sender, response ) {
		// Creamos la sesión
		if ( message.command === 'create-session' ) {
			console.group('[Wootsie]');
			console.time('Preparado');

			Streaming.create( message.name, message.control );
		}

		// Unirnos a la sesión
		if ( message.command === 'join-session' ) {
			try {
				console.group('[Wootsie]');
				console.time('Preparado');

				Streaming.join( message.name, message.sessionid );
			} catch( e ) {
				console.groupEnd()

				// Respondemos a Wootsie
				Streaming.sendMessage({ 'command': 'invalid-session' });
				delay(500)().then( Streaming.disconnect );

				console.error('[Wootsie] La sesión %s no existe', sessionId);
			}
		}

		// Wootsie nos solicita nuestro estado actual
		if ( message.command === 'status' ) {
			if ( session == null ) {
				var data = {
					command	: 'response-status',
					status	: 'disconnected',
				};
			}
			else {
				var data = {
					command		: 'response-status',
					status		: 'connected',
					sessionId	: session.key(), 
					url			: provider.getSessionUrl( session.key() )
				}
			}

			// Respondemos
			response( data );
		}

		// Queremos desconectarnos
		if ( message.command === 'disconnect' ) {
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

	/**
	 * Devuelve si soy el líder
	 */
	static imLeader() {
		return ( leader.id == client.key() );
	}
}

// Comenzamos
Streaming.init();
console.log('[Streaming]');