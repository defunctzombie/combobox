
# combobox

  A lightweight selectbox replacement. Built entirely with components, no jQuery or other frameworks. Comes with search functionality and other cool stuff.

## Installation

    $ component install eivindfjeldstad/combobox

## Use

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

## License

  MIT
