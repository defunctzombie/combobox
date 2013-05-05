# combobox
A lightweight selectbox replacement. Built entirely with components, no jQuery or other frameworks. Comes with search functionality and other cool stuff.
![combobox component](http://f.cl.ly/items/3B0M2q3B0D2b0p3x0Z3u/blurg.png)

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
