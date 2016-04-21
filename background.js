/**
 * Detecciones en segundo plano
 */
class Background
{
	/**
	 * Inicialización
	 */
	static init() {
		// Registramos los proveedores soportados
		addProviders();

		// Se ha actualizado la información de alguna pestaña
		chrome.tabs.onUpdated.addListener( Background.detect );

		// Examinamos la pestaña activa
		chrome.tabs.query({active: true}, function( tab ) {
			tab = tab[0];
			Background.detect( tab.id, null, tab );
		});
	}

	/**
	 * Devuelve si la dirección es de algún proveedor válido
	 */
	static isValidProvider( url = null ) {
		for( let i in providers ) {
			let provider = providers[i];
			if ( provider.isValid(url) ) return true;
		}

		return false;
	}

	/**
	 * Devuelve si la dirección es la página de visualización de algún proveedor válido
	 */
	static isValidWatching( url = null ) {
		for( let i in providers ) {
			let provider = providers[i];
			if ( provider.isWatching(url) ) return true;
		}

		return false;
	}

	/**
	 * Debemos detectar el proveedor de esta pestaña
	 */
	static detect( tabId, info, tab ) {
		// Una pestaña en blanco...
		if ( typeof tab.url == undefined ) return;

		//console.log(tab);

		// Nos encontramos viendo un capitulo/pelicula
		if ( Background.isValidWatching(tab.url) ) {
			// Mostramos el icono, estamos preparados
			if ( tab.status == 'complete' ) {
				chrome.pageAction.show( tabId );
				chrome.pageAction.setTitle( { tabId: tabId, title: tl('start2') } );
			}
			else {
				chrome.pageAction.hide( tabId );
				chrome.pageAction.setTitle( { tabId: tabId, title: tl('loading') } );
			}
		}

		// Estamos en la página de algún proveedor válido
		else if ( Background.isValidProvider(tab.url) ) {
			// Ocultamos el icono
			chrome.pageAction.hide( tabId );
			chrome.pageAction.setTitle( { tabId: tabId, title: tl('start_streaming') } );
		}

		// No estamos en una página válida
		else {
			// Ocultamos el icono
			chrome.pageAction.hide( tabId );
			chrome.pageAction.setTitle( { tabId: tabId, title: tl('invalid_page') } );
		}
	}
}

// Iniciamos
Background.init();