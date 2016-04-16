/**
 * Referencia a la sección de chat de la sesión
 */
var reference = null;


/**
 * Contenedor del chat
 */
var chat = null;

/**
 * Controla todo lo relacionado con el chat
 */
class Chat
{
	/**
	 * Inicialización
	 */
	static init() {
		console.group('[Chat]');

		// Conexión
		reference = session.child('chat');

		// Inyectamos el código del Chat
		this.inject();
	}

	/**
	 * [binds description]
	 */
	static binds() {
		// Escuchamos por nuevos mensajes
		reference.on('child_added', this.onReceiveMessage)

		// Presionando una tecla en el cuadro de mensaje
		$('#chat-message').on('keydown', this.prepareMessage);

		// Queremos cerrar el chat
		$('#close-chat').on('click', this.close);

		// Redimensionamos
		this.resize();
		$(window).on('resize', this.resize);

		// Algunos proveedores tienen el click bloqueado...
		$('#chat-message').on('click', function() { $('#chat-message').focus(); });

		console.log('¡Preparado!');
		console.groupEnd();
	}

	/**
	 * Limpiamos todo
	 */
	static clear() {
		// Reproductor
		var player = provider.injectChatAfterThis();
		if ( player == null || reference == null ) return;

		reference.off('child_added');
		reference = null;

		$('#chat-message').off('keydown');
		$('#close-chat').off('click');

		player.removeClass('chat-open').removeClass('chat-closed');
		chat.remove();

		$('body').removeClass( provider.name.toLowerCase() );
	}

	/**
	 * Devuelve si el chat esta oculto
	 */
	static isClosed() {
		return ( chat.hasClass('closed') );
	}

	/**
	 * Ocultamos el chat
	 */
	static close( e ) {
		e.preventDefault();

		// Reproductor
		var player = provider.injectChatAfterThis();

		// Aplicamos los estilos al
		// reproductor y chat
		player.removeClass('chat-open').addClass('chat-closed');
		chat.addClass('closed');

		// Abrir el chat al darle clic
		delay(500)().then(function() {
			chat.on('click', Chat.open);
		});
	}

	/**
	 * Mostramos el chat
	 */
	static open() {
		// Reproductor
		var player = provider.injectChatAfterThis();

		// Dejamos de escuchar por clics
		chat.off('click');

		// Aplicamos los estilos al
		// reproductor y chat
		player.removeClass('chat-closed').addClass('chat-open');
		chat.removeClass('closed');
	}

	/**
	 * [Evento] Estamos presionando una tecla en el cuadro
	 * para escribir un mensaje
	 */
	static prepareMessage( e ) {
		// Solo "ENTER"
		if ( e.keyCode != 13 ) return;
		e.preventDefault();

		var message = $('#chat-message').val();

		// Escribe un mensaje...
		if ( message.length == 0 ) return;

		// Desactivamos el cuadro
		$('#chat-message').prop('disabled', true);

		// Enviamos al servidor
		reference.push({
			clientId	: client.key(),
			clientName	: Streaming.clientName,
			message		: message,
			created		: Date.now()
		});

		// Activamos y vaciamos
		$('#chat-message').prop('disabled', false).val('');
	}

	/**
	 * Agrega un mensaje en el chat con la información
	 */
	static addMessage( data ) {
		// No tenemos chat
		if ( reference == null || chat == null ) return;

		// Creamos el mensaje
		var div = $('<div>');
		div.addClass('single');

		// Mensaje del sistema
		if ( data.system == true ) {
			div.addClass('system');
			div.html( data.message );
		}

		// Mensaje de usuario
		else {
			div.append('<strong class="name">' + data.clientName + ':</strong>');
			div.append('<p>' + htmlEntities(data.message) + '</p>');

			// Mi mensaje
			if ( data.clientId == client.key() )
				div.addClass('own');
		}

		var container = chat.find('.messages-container');

		// Lo mostramos
		container.append( div );
		div.fadeIn('slow', function() { div.addClass('active'); });

		// Scroll
		container.scrollTop( 9999 );

		// Esta oculto, avisamos...
		if ( Chat.isClosed() && !chat.hasClass('new-message') ) {
			chat.addClass('new-message');
			delay(800)().then(function() { chat.removeClass('new-message'); });
		}

		// Baja prioridad...
		setTimeout(function() {
			div.addClass('fade');
		}, 5000);
	}

	/**
	 * Envia un mensaje indicando el cambio de estado en la reproducción
	 */
	static state( name, status ) {
		// No tenemos chat
		if ( reference == null || chat == null ) return;

		var statusName = 'pausado';

		if ( status === 'playing' )
			statusName = 'reanudado';

		Chat.addMessage({
			system: true,
			message: '<strong>'+name+'</strong> ha '+statusName+' la reproducción.'
		});	
	}

	/**
	 * Envia un mensaje indicando el cambio de tiempo en la reproducción
	 */
	static seek( name, time ) {
		// No tenemos chat
		if ( reference == null || chat == null ) return;

		Chat.addMessage({
			system: true,
			message: '<strong>'+name+'</strong> ha cambiado el tiempo a ' + time
		});	
	}

	/**
	 * Actualiza la información superior del chat
	 */
	static update() {
		// No tenemos chat
		if ( reference == null || chat == null ) return;

		if ( leader != null ) {
			chat.find('.top-info .leader .name').html( leader.name );
			chat.find('.top-info .leader .time').html( Math.round(leader.current) );
		}

		if ( sessionInfo.owner != null )
			chat.find('.top-info .owner .name').html( sessionInfo.owner.name );
	}

	/**
	 * [Evento] Se ha escrito un nuevo mensaje de chat
	 */
	static onReceiveMessage( snapshot ) {
		var val = snapshot.val();
		val.system = false;

		// Iván: Hacemos un 'try' para los curiosos
		// que envien información inválida
		try {
			Chat.addMessage( val );
		} catch( e ) {

			console.error('[Wootsie] Ha ocurrido un problema al obtener un mensaje del chat');
			console.error(e);
		}
	}

	/**
	 * Inyecta el código HTML del chat en la página del Streaming
	 */
	static inject() {
		// Reproductor
		var player = provider.injectChatAfterThis();

		if ( player == null || player == undefined ) {
			console.error('Al parecer este proveedor no tiene lugar para el chat!');
			console.groupEnd();

			return;
		}

		// Código del CHAT
		var html = `<div class="wootsie-chat" id="wootsie-chat">
		<a href="#" id="close-chat" title="Ocultar chat">−</a>
		<div class="top-info">
			<div class="leader">
				<strong class="title">Líder:</strong>
				<span class="name"></span> - <span class="time"></span>
			</div>

			<div class="owner">
				<strong class="title">Anfitrión:</strong>
				<span class="name"></span>
			</div>
		</div>

		<div class="messages-container">

		</div>

		<div class="message-box">
			<textarea id="chat-message" placeholder="Escribe tu mensaje..."></textarea>
		</div>
	</div>`;

		// Inyectamos el código
		player.after( html );
		player.addClass('chat-open');

		console.log('Código inyectado');

		// Contenedor
		chat = $('#wootsie-chat');
		chat.addClass( provider.name.toLowerCase() );

		$('body').addClass( provider.name.toLowerCase() );

		// Binds
		Chat.binds();
	}

	static resize() {
		var height	= $(window).height();
		var top		= chat.find('.top-info').outerHeight();
		var message	= chat.find('.message-box').outerHeight();
		var final 	= height - (top + message);

		chat.find('.messages-container').height( final - 5 );
	}
}