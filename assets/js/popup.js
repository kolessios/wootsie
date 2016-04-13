/**
 * Controla las acciones del Popup (Wootsie) y su comunicación con Streaming
 */
class Popup
{
	/**
	 * Inicialización
	 */
	static init() {
		// Registramos los proveedores soportados
		addProviders();

		// Obtenemos la pestaña activa
		chrome.tabs.query({active: true}, function( tab ) {
			if ( typeof tab[0] == undefined ) {
				console.error('> Se ha permitido abrir el Popup sin una pestaña válida!');
				return;
			}

			// Preparamos
			tab = tab[0];
			Popup.prepare( tab );
		});
	}

	/**
	 * Prepara todo con la información de la pestaña activa
	 */
	static prepare( tab ) {
		// Pestaña
		this.tab = tab;

		// Obtenemos el proveedor de la página
		provider = getProvider( tab.url );

		// ¡No es un proveedor válido!
		if ( provider == null ) {
			console.error('[Wootsie] Se ha permitido abrir el Popup sin una pestaña válida!');
			return;
		}

		// Mostramos el logo del proveedor
		provider.setLogo();

		// Binds!
		this.binds();

		// Enviamos un mensaje a [Streaming] para preguntar por el estado actual
		this.sendMessage({ command: 'status' }, Popup.detect);
	}

	/**
	 * [binds description]
	 */
	static binds() {
		// Escuchamos por mensajes de [Streaming]
		chrome.runtime.onMessage.addListener( this.onStreamMessage );

		// Muestra una caja
		$('[data-show]').on('click', this.showBox);

		// Regresa a la selección de modo
		$('[data-back]').on('click', this.back);

		// Queremos crear la sesión
		$('#create-session').on('click', this.createSession);

		// Queremos unirnos a la sesión
		$('#join-session').on('click', this.joinSession);

		// Desconectarnos
		$('#disconnect').on('click', this.disconnect);

		$('#session_url').on('click', function() { $(this).get(0).select(); });
	}

	/**
	 * Detecta si ya estamos en una sesión activa
	 * o si hemos accedido con una dirección compartida
	 */
	static detect( message ) {
		$('.loading').hide();

		// Estamos en una sesión activa
		if ( message.status == 'connected' ) {
			Popup.connected( message );
			return;
		}

		// Verificamos la dirección
		var query		= $.query.load( Popup.tab.url );
		var session_id	= query.get('wootsie');

		// No hay parametro con la id de la sesión
		if ( session_id.length <= 0 ) return;

		// Damos clic al botón de unirse a la sesión
		$('.join-session-button').click();

		// Escribimos la ID de la sesión
		$('#id').val( session_id );
	}

	/**
	 * Muestra una caja
	 */
	static showBox() {
		var show = $(this).data('show');

		// Ocultamos el selector
		$('.mode-selector').fadeOut('fast', function() {
			$( show ).fadeIn('fast');
		});
	}

	/**
	 * Regres a la selección de modo
	 */
	static back() {
		$('.join-box, .create-box, .session-details').fadeOut('fast', function() {
			$('.mode-selector').fadeIn('fast');
		});
	}

	/**
	 * Desconectarnos de la sesión actual
	 */
	static disconnect() {
		Popup.sendMessage({
			'command': 'disconnect',
		}, function() {
			Popup.back();
		});
	}

	/**
	 * Crea una nueva sesión
	 */
	static createSession() {
		// Ajustes de sesión
		let control = $('#control').prop('checked');
		let name 	= $('#name').val();

		if ( name.length == 0 ) {
			return;
		}

		// Cargando...
		$('.create-box, .join-box').hide();
		$('.loading').show();

		// Enviamos el mensaje a Streaming para que cree una sesión
		Popup.sendMessage({
			'command'	: 'create-session',
			'control'	: control,
			'name'		: name
		});
	}

	/**
	 * Nos únimos a una sesión
	 */
	static joinSession() {
		// Ajustes de sesión
		let name	= $('#join-name').val();
		let id		= $('#id').val();

		if ( name.length == 0 ) {
			return;
		}

		// Cargando...
		$('.create-box, .join-box').hide();
		$('.loading').show();

		// Enviamos el mensaje a Streaming para que nos una a una sesión
		Popup.sendMessage({
			'command'	: 'join-session',
			'name'		: name,
			'sessionid'	: id
		});
	}

	/**
	 * [Evento] Conexión establecida
	 */
	static connected( message ) {
		// Información de la sesión
		$('*:not(input)[data-value="session_id"]').html( message.sessionId );
		$('input[data-value="session_id"]').val( message.sessionId );

		$('*:not(input)[data-value="session_url"]').html( message.url );
		$('input[data-value="session_url"]').val( message.url );

		// Terminamos...
		$('.loading').hide();
		$('.session-details').show();
	}


	/**
	 * [Evento] Hemos recibido un mensaje de Streaming
	 */
	static onStreamMessage( message, sender, response ) {
		// Nos hemos conectado
		if ( message.command === 'connected' ) {
			Popup.connected( message );
		}

		// Sesión inválida!
		if ( message.command === 'invalid-session' ) {
			$('.join-box .error-msg').show();
			$('.join-box').show();
			$('.loading').hide();
		}
	}

	/**
	 * Envía un mensaje a la tab activa
	 */
	static sendMessage( message, response = null ) {
		chrome.tabs.sendMessage( this.tab.id, message, response );
	}
}

// Comenzamos
Popup.init();