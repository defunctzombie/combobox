var Emitter = require('emitter')
  , domify = require('domify')
  , classes = require('classes')
  , query = require('query')
  , events = require('event')
  , indexOf = require('indexof');
  
/**
 * Select constructor
 */

function Select (options) {
  this.options = {};
  this.comboable = [];
  this.closed = true;
  this.value = undefined;
  this._group = undefined;
  this.searchable = options.search;
  this.render();
}

/**
 * Emitter mixin
 */

Emitter(Select.prototype);

/**
 * Render html
 */

Select.prototype.render = function () {
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

Select.prototype.add = function (value, text, comboed) {
  var template = require('./option');
  var el = domify(template)[0];
  
  this.options[value] = el;
  this.comboable.push('' + value);
  (this._group || this.list).appendChild(el);
  
  el.innerHTML = text;
  events.bind(el, 'mouseup', this.combo.bind(this, value));
  events.bind(el, 'mouseover', this.setFocus.bind(this, value));
  
  comboed = !this.value || !!comboed;
  if (comboed) this.combo(value);
  
  return this.emit('option', value, text, comboed);
};

/**
 * Add optiongroup
 */

Select.prototype.group = function (name) {
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

Select.prototype.onkeypress = function (e) {
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

Select.prototype.onkeydown = function (e) {
  var key = e.keyCode;
  switch (key) {
    case 9:
      return this.close();
    case 13:
      this.close();
      this.combo(this.inFocus || this.value);
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

Select.prototype.navigate = function (num) {
  var focus = this.inFocus;
  var comboable = this.comboable;
  var index = indexOf(comboable, focus);
  
  if (!~index) return this;
  index += num;
  
  if (comboable.length > index && index >= 0) {
    var value = comboable[index];
    this.setFocus(value);
  }
  
  return this;
};

/**
 * Highlight option with the given value
 */

Select.prototype.setFocus = function (value) {
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

Select.prototype.combo = function (value) {
  var el = this.options[value];
  if (!el) return this;
  
  var comboed = query('.comboed', this.list);
  if (comboed) classes(comboed).remove('comboed');
  classes(el).add('comboed');
  
  var label = query('.label', this.el);
  label.innerHTML = el.innerHTML;
  this.value = '' + value;
  
  this.emit('combo', this.value);
  return this.close();
};

/**
 * Scroll to option with the given value
 */

Select.prototype.scrollTo = function (value) {  
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
 * Reposition selectbox
 */

Select.prototype.reposition = function () {
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

Select.prototype.filter = function (filter) {
  var reg = new RegExp(filter || '', 'i');
  var comboable = this.comboable = [];
  
  // Hide non-matches
  for (var i in this.options) {
    var option = this.options[i];
    if (reg.test(option.innerHTML)) {
      comboable.push(i);
      classes(option).add('comboable');
    } else {
      classes(option).remove('comboable');
    }
  }
  
  // Hide empty groups
  var groups = query.all('.group', this.list);
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var options = query('.comboable', group);
    if (options) {
      classes(group).remove('empty');
    } else {
      classes(group).add('empty');
    }
  }
  
  this.emit('filter', filter);
  // Set focus
  var current = this.inFocus;
  var index = indexOf(comboable, current);
  
  if (!~index) {
    if (!comboable.length) return this.setFocus(null);
    this.setFocus(comboable[0]);
  }
  
  return this;
};

/**
 * Open selectbox
 */

Select.prototype.open = function () {
  if (!this.closed) return this;
  return this.toggle();
};

/**
 * Close selectbox
 */

Select.prototype.close = function () {
  if (this.closed) return this;
  return this.toggle();
};

/**
 * Toggle selectbox visibility
 */

Select.prototype.toggle = function () {
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