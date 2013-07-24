var Emitter = require('emitter')
  , domify = require('domify')
  , classes = require('classes')
  , query = require('query')
  , events = require('event')
  , indexOf = require('indexof')
  , keyname = require('keyname')
  , scrolltop = require('scrolltop')
  , bind = require('bind');
  
/**
 * Select constructor
 */

function Combo (options) {
  if (!(this instanceof Combo))
    return new Combo(options);
  
  this.options = {};
  this.selectable = [];
  this.closed = true;
  this.value = undefined;
  this._group = undefined;
  this.placeholder = options.placeholder || '';
  this.searchable = options.search;
  this.binding = binding(this);
  this.render();
}

/**
 * Inherit from emitter
 */

Emitter(Combo.prototype);

/**
 * Render html
 */

Combo.prototype.render = function () {
  var template = require('./templates/combo');
  this.el = domify(template);
  this.list = query('.options', this.el);
  this.input = query('.search', this.el);
  this.classes = classes(this.el);
  
  this.label = query('.label', this.el);
  this.label.innerHTML = this.placeholder;
  
  if (this.searchable)
    this.addClass('searchable');
  
  return this.bind();
};

/**
 * Bind events
 */

Combo.prototype.bind = function () {
  var bind = this.binding;
  events.bind(this.el, 'keypress', bind('onkeypress'));
  events.bind(this.el, 'keydown', bind('onkeydown'));
  events.bind(this.el, 'mousedown', stopPropagation);
  events.bind(this.el, 'mouseup', stopPropagation);
  events.bind(this.input, 'keyup', bind('onkeyup'));
  events.bind(this.input, 'change', bind('onkeyup'));
  events.bind(this.label, 'mousedown', bind('toggle'));
  return this;
};

/**
 * Unbind events
 */

Combo.prototype.unbind = function () {
  var bind = this.binding;
  events.unbind(this.el, 'keypress', bind('onkeypress'));
  events.unbind(this.el, 'keydown', bind('onkeydown'));
  events.unbind(this.el, 'mousedown', stopPropagation);
  events.unbind(this.el, 'mouseup', stopPropagation);
  events.unbind(this.input, 'keyup', bind('onkeyup'));
  events.unbind(this.input, 'change', bind('onkeyup'));
  events.unbind(this.label, 'mousedown', bind('toggle'));
  return this.unbindOutside();
};

/**
 * Bind window events
 */

Combo.prototype.bindOutside = function () {
  var bind = this.binding;
  events.bind(window, 'mousedown', bind('close'));
  events.bind(window, 'mouseup', bind('close'));
  events.bind(window, 'scroll', bind('reposition'));
  events.bind(window, 'resize', bind('reposition'));
  return this;
};

/**
 * Unbind window events
 */

Combo.prototype.unbindOutside = function () {
  var bind = this.binding;
  events.unbind(window, 'mousedown', bind('close'));
  events.unbind(window, 'mouseup', bind('close'));
  events.unbind(window, 'scroll', bind('reposition'));
  events.unbind(window, 'resize', bind('reposition'));
  return this;
};

/**
 * Add option
 */

Combo.prototype.add = function (value, text, selected) {
  var template = require('./templates/option');
  var el = domify(template);
  var list = this._group || this.list;
  
  el.innerHTML = text;
  this.options[value] = el;
  this.selectable.push('' + value);
  list.appendChild(el);
  
  var select = bind(this, 'select', value);
  var setFocus = bind(this, 'setFocus', value);
  events.bind(el, 'mouseup', select);
  events.bind(el, 'mouseover', setFocus);
  
  if (!(this.placeholder || this.value) || selected) {
    this.select(value);
  }
  
  return this.emit('option', value, text);
};

/** 
 * Remove option
 */

Combo.prototype.remove = function (value) {
  var option = this.options[value];
  this.el.removeChild(option);
  return this.emit('remove', value);
};

/**
 * Add optiongroup
 */

Combo.prototype.group = function (name) {
  var template = require('./templates/group');
  var el = domify(template);
  var label = query('.group-label', el);
  
  label.innerHTML = name;
  this._group = query('.options', el);
  this.list.appendChild(el);
  
  return this.emit('group', name);
};

/**
 * React to keypress event when closed
 */

var isLetter = /\w/;

Combo.prototype.onkeypress = function (e) {
  if (!this.closed) return;
  
  var key = e.keyCode
  var c = String.fromCharCode(key);
    
  if (!isLetter.test(c)) return;
  
  preventDefault(e);
  this.input.value = c;
  this.open();
  this.filter(c);
};

/**
 * React to keydown event
 */

Combo.prototype.onkeydown = function (e) {
  var key = e.keyCode;
  var current = this.inFocus || this.value;
  
  switch (keyname(key)) {
    case 'tab':
    case 'esc':
      this.close();
      break;
    case 'enter':
      preventDefault(e);
      this.select(current);
      break;
    case 'left':
    case 'right':
      this.open();
      break;
    case 'up':
      preventDefault(e);
      this.navigate(-1);
      break;
    case 'down':
      preventDefault(e);
      this.navigate(1);
      break;
  }
};

/**
 * React to keyup event
 */

Combo.prototype.onkeyup = function () {
  this.filter(this.input.value);
};


/**
 * Move focus n positions up or down
 */

Combo.prototype.navigate = function (n) {
  if (this.closed) return this.open();
  
  var selectable = this.selectable;
  var i = indexOf(selectable, this.inFocus) + n;
  
  if (selectable.length > i && i >= 0) {
    var value = selectable[i];
    this.setFocus(value);
  }
  
  return this;
};

/**
 * Highlight option with the given value
 */

Combo.prototype.setFocus = function (value) {
  var focus = query('.focus', this.list);
  var option = this.options[value];
  
  if (!option) return this;
  if (focus) classes(focus).remove('focus');
  classes(option).add('focus');
  
  this.inFocus = '' + value;
  this.scrollTo(value);
  
  return this.emit('focus', value);
};

/**
 * Select option with the given value
 */

Combo.prototype.select = function (value) {
  var option = this.options[value];
  if (!option) return this;
  
  var selected = query('.selected', this.list);
  if (selected) classes(selected).remove('selected');
  classes(option).add('selected');
  
  this.label.innerHTML = option.innerHTML;
  this.value = '' + value;
  
  this.emit('select', value);
  return this.close();
};

/**
 * Scroll to option with the given value
 */

Combo.prototype.scrollTo = function (value) {  
  var option = this.options[value];
  if (!option) return this;
  
  var list = query('.list', this.el);
  var lh = list.clientHeight;
  var lt = list.scrollTop;
  var lb = lt + lh;
  
  var oh = option.offsetHeight;
  var ot = option.offsetTop;
  
  if (ot + oh > lb) {
    list.scrollTop = ot + oh - lh;
  } else if (ot < lt) {
    list.scrollTop = ot;
  }
  
  return this;
}

/**
 * Reposition combobox
 */

Combo.prototype.reposition = function () {
  if (this.closed) return this;
  
  var wt = scrolltop();
  var wb = wt + window.innerHeight;
  
  var lh = this.label.offsetHeight;
  var lt = offset(this.el);
  
  var inner = query('.inner', this.el);
  var ih = inner.offsetHeight;
  
  if (lt + lh + ih <= wb) {
    this.addClass('south');
    this.removeClass('north');  
    return this.emit('position', 'south');
  }
  
  this.addClass('north');
  this.removeClass('south');
  return this.emit('position', 'north');
};

/**
 * Filter options by text
 */

Combo.prototype.filter = function (filter) {
  var reg = new RegExp(filter || '', 'i');
  var selectable = this.selectable = [];
  
  for (var i in this.options) {
    var option = this.options[i];
    
    if (reg.test(option.innerHTML)) {
      selectable.push(i);
      classes(option).add('selectable');
    } else {
      classes(option).remove('selectable');
    }
  }
  
  this.hideEmpty();
  this.refocus();
  
  return this.emit('filter', filter);
};

/**
 * Hide empty groups
 */

Combo.prototype.hideEmpty = function () {
  var groups = query.all('.group', this.list);
  
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var options = query('.selectable', group);
    
    if (options) {
      classes(group).remove('empty');
    } else {    
      classes(group).add('empty');
    }
  }
  
  return this;
};

/**
 * Refocus if the element in focus is unselectable
 */

Combo.prototype.refocus = function () {
  var selectable = this.selectable;
  
  if (~indexOf(selectable, this.inFocus))
    return this.scrollTo(this.inFocus);
  
  if (!selectable.length) 
    return this.setFocus(null);
    
  return this.setFocus(selectable[0]);
};

/**
 * Append combobox to el
 */

Combo.prototype.appendTo = function (el) {
  el.appendChild(this.el);
  return this;
};

/**
 * Add class to combobox
 */

Combo.prototype.addClass = function (name) {
  this.classes.add(name);
  return this;
};

/**
 * Remove class from combobox
 */

Combo.prototype.removeClass = function (name) {
  this.classes.remove(name);
  return this;
};

/**
 * Open combobox
 */

Combo.prototype.open = function () {
  if (!this.closed) return this;
  return this.toggle();
};

/**
 * Close combobox
 */

Combo.prototype.close = function () {
  if (this.closed) return this;
  return this.toggle();
};

/**
 * Toggle combobox visibility
 */

Combo.prototype.toggle = function () {
  this.closed = !this.closed;
  
  this.classes.toggle('open');
  this.classes.toggle('closed');
    
  if (this.closed) {
    this.el.focus();
    this.unbindOutside();
    return this.emit('close');
  }
  
  this.bindOutside();
  this.setFocus(this.value);
  this.reposition();
  
  var input = this.input;
  tick(function () {
    input.focus();
  });

  return this.emit('open');
};

/**
 * Create or return function bound to `this` with `_` as a prefix
 */

function binding (obj) {
  return function (name) {
    var _name = '_' + name;
    obj[_name] = obj[_name] || bind(obj, name);
    return obj[_name];
  }
}

/**
 * Get element offset
 */

function offset (el, to) {
  var parent = el;
  var top = el.offsetTop;
  
  while (parent = parent.offsetParent) {
    top += parent.offsetTop;
    if (parent == to) return top;
  }
  
  return top;
}

/**
 * Prevent default
 */

function preventDefault (e) {
  if (e.preventDefault) return e.preventDefault();
  e.returnValue = false;
}

/**
 * Stop event propagation
 */

function stopPropagation (e) {
  if (e.stopPropagation) return e.stopPropagation();
  e.cancelBubble = true;
}

/**
 * Defer execution
 */

function tick (callback) {
  setTimeout(callback, 0);
}

module.exports = Combo;