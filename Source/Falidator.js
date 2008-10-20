/*
Script: Falidator.js
  MooTools - My Object Oriented JavaScript Tools.
 
License:
  MIT-style license.
 
Copyright:
  Copyright (c) 2008-2009 Thomas Dullnig (http://thomasdullnig.blogspot.com).

Links:
  Mootools: (http://mootools.net)
  Moo-Docs: (http://docs.mootools.net)

Simple to use Form-Validator based on the great Mootools-Framework(ver 1.2).

Options:
	- All options from the Request-Class
	- invalidClass:
		The value of invalidClass is added to an invalid form-field
		Default: 'invalid'
		
	- validClass:
		The value of validClass is added to a valid form-field
		Default: 'valid'
		
	- requiredClass:
		If a form-field has this class, it's not allowed to be empty
		Default: 'required'
		
	- ignoredClass:
		If a form-field has this class, it's ignored and not checked
		Default: 'ignored'
		
	- focusClass:
		The value of focusClass is added to the focused form-field
		Default: 'focused'
		
	- fields:
		You can manually add a set of elements (form-fields). As a single element, string, selector or a list of elements
		Default: null
		
	- ajax:
		Sending the form via an Ajax-Request, or not.
		Default: false
		
	- validateOn:
		Which event should trigger the validation? It could be every event a form-field fires, e.g. 'blur', 'click', 'keyup'...
		If you set validateOn on false, the validation is triggered ONLY before the form is send.
		Default: false
		
	- rules:
		A hash of function names and functions, which test if a field is valid or not
		Default: {}
		
	- messages:
		A hash of messages names and message-texts, 
		the messages names must be the same as the function names (exception: the message name for the required-check must be the same as the requiredClass-option)
		Default: {}
		
	- Events:	
		onInvalidField:
			Fired after a field-validation if the value is invalid
			Arguments:
				1. field (Element): The invalid field
				2. messages (Array): All invalid messages
				
		onValidField:
			Fired after a field-validation if the value is valid
			Arguments:
				1. field (Element): The valid field
				
		onInvalidForm:
			Fired after all field-validations and one of the field-values where invalid
			Arguments:
				1. invalidFields (Array): An array of all invalid fields
				
		onFieldFocus:
			Fired when a watched field gains focus 
			Arguments:
				1. event (Event): The mootools event-native
				2. field (Element): The focused field
				
		onFieldBlur:
			Fired when a watched field loses focus
			Arguments:
				1. event (Event): The mootools event-native
				2. field (Element): The field which lost focused		
*/

var Falidator = new Class({
	Implements: [Options, Events],
	options: {
		invalidClass: 'invalid',
		validClass: 'valid',
		requiredClass: 'required',
		ignoredClass: 'ignored',
		focusClass: 'focused',
		fields: null,
		ajax: false,
		validateOn: false,
		rules: {},
		messages: {}
		/*
		onInvalidField: $empty,
		onValidField: $empty,
		onInvalidForm: $empty,
		onFieldFocus: $empty,
		onFieldBlur: $empty,
		*/
	},
	
	initialize: function(form, options){
		this.setOptions(options);
		this.options.rules = $H(this.options.rules);
		this.options.messages = $H(this.options.messages);
		
		this.form = $(form).set('send', this.options);
		
		this.fields = $$((this.options.fields ? this.options.fields : this.form.getElements('input[type!=button][type!=image][type!=submit][type!=reset][type!=hidden], textarea, select').filter(function(item){
			return !item.hasClass(this.options.ignoredClass);
		}, this)));
		
		this.fields.each(function(field){
			this.prepareField(field);
		}, this);
		
		this.form.addEvent('submit', this.onSubmit.bind(this));
	},
	
	isEmpty: function(field){
			switch (field.type) {
				case 'text':
				case 'password':
				case 'file':
				case 'textarea':
				case 'select-one':
					return (field.get('value').trim() === '');
				case 'select-multiple':
					return (field.get('value').length === 0);
				case 'radio':
				case 'checkbox':
					return (!field.get('checked'));
			}
			return false;
	},
	
	validateField: function(field){
		var valid = true;
		var messages = field.store('messages', []).retrieve('messages');
		        
        if (field.hasClass(this.options.requiredClass) && this.isEmpty(field)) {
			messages.push(this.options.messages.get(this.options.requiredClass));
			
			this.fireEvent('invalidField', [field, messages]);
			return false;
        }
				
		switch (field.type) {
			case 'text':
			case 'password':
			case 'file':
			case 'textarea':
			case 'select-one':
				var fieldRules = field.retrieve('rules');
				this.options.rules.each(function(rule, name){
					if (fieldRules.has(name)) {
						var ruleValid = rule(field.get('value'), fieldRules.get(name), field);
						valid = (valid ? ruleValid : false);
						if (!ruleValid) {
							messages.push(this.options.messages.get(name).substitute(fieldRules[name]));
						}
					}
				}, this);
				
				if (valid) {
					this.fireEvent('validField', field);
				}
				else {
					this.fireEvent('invalidField', [field, messages]);
				}
				break;
			case 'radio':
			case 'checkbox':
			case 'select-multiple':
				if(valid) {
					this.fireEvent('validField', field);
				}			
				break;
		}

		return valid;
	},
	
	validate: function(){
		var invalidFields = [];
		
		this.fields.each(function(field){
			if(this.validateField(field) === false){
				invalidFields.include(field);
			}
		}, this);
		
		if(invalidFields.length > 0){
			this.fireEvent('invalidForm', [invalidFields]);
			return false;
		}
		return true;	
	},
	
	parseRule: function(rule){
		var parts = rule.match(/([^()]*)\(?([^()]*)\)?/);
		var parsedRule = {};
		parsedRule[parts[1]] = parts[2].split(',').map(function(opt){
			opt = opt.trim(); 
			return (opt !== '' ? opt : null); 
		}).clean();
		return parsedRule;
	},
	
	parseRules: function(rules){
		var parsedRules = new Hash();
		rules.split(' ').each(function(rule){
			parsedRules.extend(this.parseRule(rule));
		}, this);
		return parsedRules;
	},
	
	setRule: function(name, fn, msg){
		($type(fn) === 'function' ? this.options.rules.set(name, fn) : null);
		($type(msg) === 'string' ? this.options.messages.set(name, msg) : null);
		return this;
	},
	
	eraseRule: function(name){
		this.options.rules.erase(name);
		this.options.messages.erase(name);
		return this;
	},
	
	setMessage: function(name, msg){
		($type(msg) === 'string' ? this.options.messages.set(name, msg) : null);
		return this;
	},
	
	prepareField: function(field){
		field.store('rules', this.parseRules(field.get('class')));
		
		field.addEvents({
			'focus': this.onFocus.bindWithEvent(this, field),
			'blur': this.onBlur.bindWithEvent(this, field)
		});
		
		if (this.options.validateOn) {
			field.addEvent(this.options.validateOn, this.validateField.bind(this, field));
		}
		
		return field;	
	},
	
	add: function(fields){
		$$(fields).each(function(field){
			this.prepareField(field);
			this.fields.include(field);
		}, this);
	},
	
	remove: function(fields){
		$$(fields).each(function(field){
			this.fields.erase(field);
		}, this);
	},
	
	onFocus: function(e, field){
		this.fireEvent('fieldFocus', [e, field]);
	},
	
	onBlur: function(e, field){
		this.fireEvent('fieldBlur', [e, field]);
	},
	
	onSubmit: function(e){
		e.stop();
		
		this.valid = this.validate();
		
		if (this.valid) {
			if (this.options.ajax) {
				this.form.send();
			}
			else {
				this.form.submit();
			}
		}
		return false;
	}
});