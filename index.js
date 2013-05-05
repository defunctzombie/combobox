var Emitter = require('emitter')
  , domify = require('domify')
  , classes = require('classes')
  , query = require('query')
  , events = require('event')
  , indexOf = require('indexof');
  
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
  var template = require('./template');
  this.el = domify(template)[0];
  this.list = query('.options', this.el);
  
  var label = query('.label', this.el);
  events.bind(label, 'mousedown', this.toggle.bind(this));
  
  events.bind(this.el, 'keypress', this.onkeypress.bind(this));
  events.bind(this.el, 'keydown', this.onkeydown.bind(this));
  outside(this.el, 'mousedown mouseup', this.close.bind(this));
  multi(window, 'scroll resize', this.reposition.bind(this));
  
  if (this.searchable) {
    var self = this;
    classes(this.el).add('searchable');
    var input = query('.search', this.el);
    multi(input, 'keyup change', function () {
      self.filter(this.value);
    });
  }
  
  return this.emit('render', this.el);
};

/**
 * Add option
 */

Combo.prototype.add = function (value, text, selected) {
  var template = require('./option');
  var el = domify(template)[0];
  
  this.options[value] = el;
  this.selectable.push('' + value);
  (this._group || this.list).appendChild(el);
  
  el.innerHTML = text;
  events.bind(el, 'mouseup', this.select.bind(this, value));
  events.bind(el, 'mouseover', this.setFocus.bind(this, value));
  
  selected = !this.value || !!selected;
  if (selected) this.select(value);
  
  return this.emit('option', value, text, selected);
};

/**
 * Add optiongroup
 */

Combo.prototype.group = function (name) {
  var template = require('./group');
  var el = domify(template)[0];
  
  query('.group-label', el).innerHTML = name;
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
  var chr = String.fromCharCode(key);
    
  if (/\w/.test(chr)) {
    query('.search', this.el).value = chr;
    this.open();
    this.filter(chr);
    preventDefault(e);
  }
};

/**
 * React to keydown event
 */

Combo.prototype.onkeydown = function (e) {
  var key = e.keyCode;
  switch (key) {
    case 9:
      return this.close();
    case 13:
      this.close();
      this.select(this.inFocus || this.value);
      return preventDefault(e);
    case 27:
      this.close();
      return preventDefault(e);
    case 37:
    case 39:
      return this.open();
    case 38:
    case 40:
      preventDefault(e);
      if (this.closed) return this.open();
      return this.navigate(key === 38 ? -1 : 1);
  }
};

/**
 * Move focus n positions up or down
 */

Combo.prototype.navigate = function (num) {
  var focus = this.inFocus;
  var selectable = this.selectable;
  var index = indexOf(selectable, focus);
  
  if (!~index) return this;
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
  var top = list.scrollTop;
  var bottom = top + list.clientHeight;
  var height = el.offsetHeight;
  var pos = el.offsetTop;
  
  if (pos + height > bottom) {
    list.scrollTop = pos + height - list.clientHeight;
  } else if (pos < top) {
    list.scrollTop = 0;
    list.scrollTop = pos;
  }
  
  return this;
}

/**
 * Reposition combobox
 */

Combo.prototype.reposition = function () {
  if (this.closed) return this;
  
  var top = document.documentElement.scrollTop || document.body.scrollTop;
  var bottom = top + window.innerHeight;
  var off = offset(this.list);
  var classlist = classes(this.el);
  
  if (off.top + this.list.offsetHeight > bottom) {
    classlist.add('north');
    classlist.remove('south');
    return this.emit('position', 'north');
  }
  
  classlist.add('south');
  classlist.remove('north');  
  return this.emit('position', 'south');
};

/**
 * Filter options by text
 */

Combo.prototype.filter = function (filter) {
  var reg = new RegExp(filter || '', 'i');
  var selectable = this.selectable = [];
  
  // Hide non-matches
  for (var i in this.options) {
    var option = this.options[i];
    if (reg.test(option.innerHTML)) {
      selectable.push(i);
      classes(option).add('selectable');
    } else {
      classes(option).remove('selectable');
    }
  }
  
  // Hide empty groups
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
  
  this.emit('filter', filter);
  // Set focus
  var current = this.inFocus;
  var index = indexOf(selectable, current);
  
  if (!~index) {
    if (!selectable.length) return this.setFocus(null);
    this.setFocus(selectable[0]);
  }
  
  return this;
};

/**
 * Append combobox to el
 */

Combo.prototype.appendTo = function (el) {
  el.appendChild(this.el);
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
  
  classes(this.el)
    .toggle('open')
    .toggle('closed');
    
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
  
  var top = 0;
  var left = 0;
  
  while (parent = parent.offsetParent) {
    top += parent.offsetTop;
    left += parent.offsetLeft;
    if (parent == to) break;
  }
  
  return {
      top: top
    , left: left
  };
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

module.exports = Select;