var Emitter = require('emitter')
  , domify = require('domify')
  , classes = require('classes')
  , query = require('query')
  , events = require('event')
  , indexOf = require('indexof')
  , keyname = require('keyname')
  , scrolltop = require('scrolltop');
  
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
  this.searchable = options.search;
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
  this.el = domify(template)[0];
  this.list = query('.options', this.el);
  
  var label = query('.label', this.el);
  var toggle = this.toggle.bind(this);
  events.bind(label, 'mousedown', toggle);
  
  var onkeypress = this.onkeypress.bind(this);
  var onkeydown = this.onkeydown.bind(this);
  var close = this.close.bind(this);

  events.bind(this.el, 'keypress', onkeypress);
  events.bind(this.el, 'keydown', onkeydown);
  outside(this.el, 'mousedown mouseup', close);
  
  var reposition = this.reposition.bind(this);
  multi(window, 'scroll resize', reposition);
  
  if (!this.searchable) return this;
  
  var self = this;
  var input = query('.search', this.el);
  classes(this.el).add('searchable');
  multi(input, 'keyup change', function () {
    self.filter(this.value);
  });
  
  return this;
};

/**
 * Add option
 */

Combo.prototype.add = function (value, text, selected) {
  var template = require('./templates/option');
  var el = domify(template)[0];
  
  el.innerHTML = text;
  this.options[value] = el;
  this.selectable.push('' + value);
  
  var list = this._group || this.list;
  var select = this.select.bind(this, value);
  var setFocus = this.setFocus.bind(this, value);
  
  list.appendChild(el);
  events.bind(el, 'mouseup', select);
  events.bind(el, 'mouseover', setFocus);
  
  selected = !this.value || selected;
  if (selected) this.select(value);
  
  return this.emit('option', value, text);
};

/**
 * Add optiongroup
 */

Combo.prototype.group = function (name) {
  var template = require('./templates/group');
  var el = domify(template)[0];
  
  var label = query('.group-label', el);
  label.innerHTML = name;
  
  this._group = query('.options', el);
  this.list.appendChild(el);
  
  return this.emit('group', name);
};

/**
 * React to keypress event when closed
 */

Combo.prototype.onkeypress = function (e) {
  if (!this.closed) return;
  
  var key = e.keyCode
  var c = String.fromCharCode(key);
    
  if (!(/\w/.test(c))) return;
  
  preventDefault(e);
  query('.search', this.el).value = chr;
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
      return this.close();
    case 'enter':
      preventDefault(e);
      return this.select(current);
    case 'left':
    case 'right':
      return this.open();
    case 'up':
    case 'down':
      preventDefault(e);
      if (this.closed) return this.open();
      return this.navigate(key === 38 ? -1 : 1);
  }
};

/**
 * Move focus n positions up or down
 */

Combo.prototype.navigate = function (num) {
  var selectable = this.selectable;
  var index = indexOf(selectable, this.inFocus);
  
  if (index < 0) return this;
  index += num;
  
  if (selectable.length > index && index >= 0) {
    var value = selectable[index];
    this.setFocus(value);
  }
  
  return this;
};

/**
 * Highlight option with the given value
 */

Combo.prototype.setFocus = function (value) {
  var focus = query('.focus', this.list);
  var el = this.options[value];
  
  if (!el) return this;
  if (focus) classes(focus).remove('focus');
  classes(el).add('focus');
  
  this.inFocus = '' + value;
  this.scrollTo(value);
  
  return this.emit('focus', this.inFocus);
};

/**
 * Select option with the given value
 */

Combo.prototype.select = function (value) {
  var el = this.options[value];
  if (!el) return this;
  
  var selected = query('.selected', this.list);
  if (selected) classes(selected).remove('selected');
  classes(el).add('selected');
  
  var label = query('.label', this.el);
  label.innerHTML = el.innerHTML;
  this.value = '' + value;
  
  this.emit('select', this.value);
  return this.close();
};

/**
 * Scroll to option with the given value
 */

Combo.prototype.scrollTo = function (value) {  
  var el = this.options[value];
  if (!el) return this;
  
  var list = query('.list', this.el);
  var lh = list.clientHeight;
  var lt = list.scrollTop;
  var lb = lt + lh;
  
  var eh = el.offsetHeight;
  var et = el.offsetTop;
  
  if (et + eh > lb) {
    list.scrollTop = et + eh - lh;
  } else if (et < lt) {
    list.scrollTop = et;
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
  
  var label = query('.label', this.el);
  var lh = label.offsetHeight;
  var lt = offset(this.el);
  
  var inner = query('.inner', this.el);
  var ih = inner.offsetHeight;
  var classlist = classes(this.el);
  
  if (lt + lh + ih <= wb) {
    classlist.add('south');
    classlist.remove('north');  
    return this.emit('position', 'south');
  }
  
  classlist.add('north');
  classlist.remove('south');
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
  var index = indexOf(selectable, this.inFocus);
  
  if (~index) return this;
  
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
  
  var classlist = classes(this.el);
  classlist.toggle('open');
  classlist.toggle('closed');
    
  if (this.closed) {
    this.el.focus();
    return this.emit('close');
  }
  
  this.setFocus(this.value);
  this.reposition();
  
  var input = query('.search', this.el);
  tick(function () {
    input.focus();
  });

  return this.emit('open');
};

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
 * Multiple events
 */

function multi (el, evt, callback) {
  evt = evt.split(' ');
  for (var i = 0; i < evt.length; i++) {
    events.bind(el, evt[i], callback);
  }
}

/**
 * Defer execution
 */

function tick (callback) {
  setTimeout(callback, 0);
}

/**
 * Detect click outside element
 */

function outside (el, evt, callback) {
  multi(el, evt, stopPropagation);
  multi(document, evt, callback);
}

module.exports = Combo;