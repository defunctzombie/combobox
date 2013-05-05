
build: components index.js combobox.css template.js group.js option.js
	@component build --dev

template.js: templates/combo.html
	@component convert $<

group.js: templates/group.html
	@component convert $<
	
option.js: templates/option.html
	@component convert $<

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js group.js option.js

.PHONY: clean
