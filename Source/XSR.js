/*
Script: XSR.js
  MooTools - My Object Oriented JavaScript Tools.

License:
  MIT-style license.
 
Copyright:
  Copyright (c) 2008-2009 Thomas Dullnig (http://thomasdullnig.blogspot.com).

Links:
  Mootools: (http://mootools.net)
  Moo-Docs: (http://docs.mootools.net)

Based on:
  Mootools 1.2.1

A cross site request class (XSR) using the same technique as JSONP, but extends it to also validate (X)HTML and pure XML.
In fact you can validate anything by extending the base XSR-class
*/

XSR = new Class({
	Implements: [Options, Events, Chain],
	
	options: {
		/*
		 onRequest: $empty,
		 onComplete: $empty,
		 onCancel: $empty,
		 onSuccess: $empty,
		 onTimeout: $empty
		 */
		url: '',
		data: '',
		callback: '',
		timeout: 30000
	},
	
	initialize: function(opt){
		this.setOptions(opt);
		this.delayId = undefined;
		
		if (XSR['callbackStack'] === undefined) {
			XSR.callbackStack = $H();
		}
		this.callback = this.callback.bind(this);
		this.dummy = this.dummy.bind(this);
		this.send = this.send.bind(this);
	},
	
	send: function(opt){
		if (this.delayId !== undefined) {
			switch (this.options.link) {
				case 'chain':
					this.chain(this.send.pass([opt]));
					return;
				case 'cancel':
					this.cancel();
					break;
				default:
					return;
			}
		}
		
		this.setOptions(opt);
		this.cancelled = false;
		this.id = $random(10, $time());
		
		this.fireEvent('request');
		if (!this.cancelled) {
			var prefix = (this.options.url.contains('?') ? '&' : '?');
			this.data = $H(this.options.data).set(this.options.callback, 'XSR.callbackStack[' + this.id + ']');
			XSR.callbackStack.set(this.id, this.callback);
			this.delayId = this.timeout.delay(this.options.timeout, this);
			this.script = new Asset.javascript(this.options.url + prefix + $H(this.data).toQueryString());
		}
		return this;
	},
	
	cancel: function(){
		this.cancelled = true;
		this.cleanup();
		XSR.callbackStack.set(this.id, this.dummy.pass(this.id));
		this.fireEvent('cancel').onComplete();
		return this;
	},
	
	timeout: function(){
		this.cancelled = true;
		XSR.callbackStack.set(this.id, this.dummy.pass(this.id));
		this.cleanup();
		this.fireEvent('timeout').onComplete();
		return this;
	},
	
	cleanup: function(){
		$clear(this.delayId);
		this.delayId = undefined;
		($defined(this.script) ? this.script.destroy() : null);
		return this;
	},
	
	dummy: function(id){
		XSR.callbackStack.erase(id);
		return this;
	},
	
	onComplete: function(){
		this.fireEvent('complete', arguments);
		this.callChain();
		return this;
	},
	
	callback: function(resp){
		if (this.cancelled) {
			return;
		}
		this.cleanup().dummy(this.id);
		
		var response = $A(this.processResponse(resp));
		
		this.fireEvent('success', [response]).onComplete(response);
	},
	
	processResponse: function(resp){
		return resp;
	}
});

XSR.JSONP = new Class({
	Extends: XSR,
	
	options: {
		secure: true
	},
	
	processResponse: function(json){
		var text = '';
		if ($type(json) === 'string') {
			text = json;
			json = JSON.decode(json, this.options.secure);
		}
		
		return [json, text];
	}
});

XSR.HTMLP = new Class({
	Extends: XSR,
	
	options: {
		update: false,
		evalScripts: true,
		filter: false
	},
	
	//Code stolen from Request.HTML class (Mootools 1.2.1)
	processHTML: function(text){
		var match = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		text = (match) ? match[1] : text;

		var container = new Element('div');

		return $try(function(){
			var root = '<root>' + text + '</root>', doc;
			if (Browser.Engine.trident){
				doc = new ActiveXObject('Microsoft.XMLDOM');
				doc.async = false;
				doc.loadXML(root);
			} else {
				doc = new DOMParser().parseFromString(root, 'text/xml');
			}
			root = doc.getElementsByTagName('root')[0];
			for (var i = 0, k = root.childNodes.length; i < k; i++){
				var child = Element.clone(root.childNodes[i], true, true);
				if (child) {
					container.grab(child);
				}
			}
			return container;
		}) || container.set('html', text);
	},

	processResponse: function(text){
		var javascript;
		
		var html = text.stripScripts(function(script){
			javascript = script;
		});

		var temp = this.processHTML(html);

		var tree = temp.childNodes;
		var elements = temp.getElements('*');

		if (this.options.filter) {
			tree = elements.filter(options.filter);
		}
		if (this.options.update) {
			$(this.options.update).empty().set('html', html);
		}
		if (this.options.evalScripts) {
			$exec(javascript);
		}

		return [tree, elements, text, javascript];
	}	
});

XSR.XMLP = new Class({
	Extends: XSR,
	
	processXML: function(xml){
		return $try(function(){
			var doc;
			
			if (Browser.Engine.trident){
				doc = new ActiveXObject('Microsoft.XMLDOM');
				doc.async = false;
				doc.loadXML(xml);
			} else {
				doc = new DOMParser().parseFromString(xml, 'text/xml');
			}
			
			return doc;
		});
	},	
	
	processResponse: function(xml){
		var doc = this.processXML(xml);
		return [doc, xml];
	}	
});

