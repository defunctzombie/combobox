# combobox
A lightweight selectbox replacement. Built entirely with components, no jQuery or other frameworks. Comes with search functionality, keyboard navigation and other cool stuff.

![combobox component](http://f.cl.ly/items/3S2D3E3s2c0R320g3e39/combobox.png)

## Installation
    $ component install eivindfjeldstad/combobox

## Example
```js
var Combo = require('combobox');
var combo = Combo({ search: true });

combo.group('Group 1')
  .add(1, 'Option 1')
  .add(2, 'Option 2');
  
combo.appendTo(document.body);
```

## API
TODO
  
## TODO
Make it easier to replace existing select elements

## License
MIT
