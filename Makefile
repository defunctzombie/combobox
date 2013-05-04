
build: components index.js combobox.css template.js group.js option.js
	@component build --dev

template.js: template.html
	@component convert $<

group.js: group.html
	@component convert $<
	
option.js: option.html
	@component convert $<

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js group.js option.js

.PHONY: clean
